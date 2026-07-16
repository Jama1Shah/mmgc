import { NextResponse } from 'next/server';
import mmgc_db from '@/lib/mmgc_db';
import Appointment from '@/models/Appointment';
import { checkAvailabilityQuerySchema } from '@/schemas/appointment.schema';

export async function GET(req) {
    try {
        await mmgc_db();
        const { searchParams } = new URL(req.url);

        // Validate incoming scheduling metrics against live schemas
        const rawParams = Object.fromEntries(searchParams.entries());
        const validation = checkAvailabilityQuerySchema.safeParse(rawParams);
        if (!validation.success) {
            return NextResponse.json({ error: "Validation failed", details: validation.error.format() }, { status: 400 });
        }

        const doctorName = validation.data.doctor;
        const date = validation.data.date;
        const time = validation.data.time;
        const excludeId = validation.data.excludeId; // Captured parameter

        const now = new Date();
        const requestedDateTime = new Date(`${date} ${time}`);
        const isPast = requestedDateTime < now;

        // Construct query to ignore Cancelled, Archived, and Rejected slots
        const queryFilter = { 
            doctorName, 
            date, 
            time, 
            status: { $nin: ['Cancelled', 'Archived', 'Rejected','Prescribed'] } 
        };

        // If rescheduling, don't flag conflicts against our own original entry record ID
        if (excludeId) {
            queryFilter._id = { $ne: excludeId };
        }

        const existing = await Appointment.findOne(queryFilter);

        // If no alternative matching active record is found AND the slot is not in the past, it is open/available
        if (!existing && !isPast) {
            return NextResponse.json({ available: true });
        }

        // Find Next Recommendation
        let nextTime = time;
        let recommendationDate = date;
        let isInvalid = true;
        
        while (isInvalid) {
            let [timePart, ampm] = nextTime.trim().split(/\s+/);
            ampm = ampm ? ampm.toUpperCase() : '';
            let [hours, minutes] = timePart.split(':').map(Number);

            minutes += 5; // Reduced step interval to 5 minutes
            if (minutes >= 60) {
                minutes = 0;
                hours += 1;
                if (hours === 12) {
                    ampm = ampm === 'AM' ? 'PM' : 'AM';
                } else if (hours > 12) {
                    hours = 1;
                }
            }

            // Check if the incremented time goes beyond the daily appointment limit (5:00 PM)
            let isPastEnd = false;
            if (ampm === 'PM') {
                if (hours > 5 && hours !== 12) {
                    isPastEnd = true;
                } else if (hours === 5 && minutes > 0) {
                    isPastEnd = true;
                }
            }

            if (isPastEnd) {
                // Advance to the next day and set time to 8:55 AM so the top loop turns it into exactly 09:00 AM
                let d = new Date(recommendationDate + 'T00:00:00');
                d.setDate(d.getDate() + 1);
                recommendationDate = d.toISOString().split('T')[0];
                nextTime = "08:55 AM";
                continue;
            }

            const newHours = hours.toString().padStart(2, '0');
            const newMinutes = minutes.toString().padStart(2, '0');
            nextTime = `${newHours}:${newMinutes} ${ampm}`;

            // Make sure the recommendation auto-assignment loop stays ahead of the current absolute time
            const nextDateTime = new Date(`${recommendationDate} ${nextTime}`);
            if (nextDateTime < now) {
                isInvalid = true;
                continue;
            }

            // Recheck recommendation loop against active slots, maintaining exclusion parameters logic
            const recommendationFilter = { 
                doctorName, 
                date: recommendationDate, 
                time: nextTime, 
                status: { $nin: ['Cancelled', 'Archived', 'Rejected','Prescribed'] } 
            };
            
            if (excludeId) {
                recommendationFilter._id = { $ne: excludeId };
            }

            const isTaken = await Appointment.findOne(recommendationFilter);
            isInvalid = !!isTaken;
        }

        return NextResponse.json({
            available: false,
            recommendation: { date: recommendationDate, time: nextTime }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}