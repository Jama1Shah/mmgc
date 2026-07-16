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
        
        // Robust 12-hour AM/PM string parsing to standard 24-hour integers for the requested slot
        let [reqTimePart, reqAmpm] = time.trim().split(/\s+/);
        let [reqH, reqM] = reqTimePart.split(':').map(Number);
        let reqH24 = reqH;
        if (reqAmpm?.toUpperCase() === 'PM' && reqH !== 12) reqH24 += 12;
        if (reqAmpm?.toUpperCase() === 'AM' && reqH === 12) reqH24 = 0;

        let [bYr, bMo, bDy] = date.split('-').map(Number);
        const requestedDateTime = new Date(bYr, bMo - 1, bDy, reqH24, reqM, 0);
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

        // If slot is free and in the future, return instantly
        if (!existing && !isPast) {
            return NextResponse.json({ available: true });
        }

        // Otherwise, run auto-recommendation algorithm for next closest slot
        let recommendationDate = date;
        let nextTime = time;
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
                // FIXED: Advance to the next day safely avoiding UTC/Local timezone alignment shifting bugs
                let [year, month, day] = recommendationDate.split('-').map(Number);
                let d = new Date(Date.UTC(year, month - 1, day));
                d.setUTCDate(d.getUTCDate() + 1);
                recommendationDate = d.toISOString().split('T')[0];
                nextTime = "08:55 AM";
                continue;
            }

            const newHours = hours.toString().padStart(2, '0');
            const newMinutes = minutes.toString().padStart(2, '0');
            nextTime = `${newHours}:${newMinutes} ${ampm}`;

            // FIXED: Safe local Date object configuration using numeric properties to avoid platform string parsing failures
            let [tPart, ampmPart] = nextTime.trim().split(/\s+/);
            let [h, m] = tPart.split(':').map(Number);
            let h24 = h;
            if (ampmPart?.toUpperCase() === 'PM' && h !== 12) h24 += 12;
            if (ampmPart?.toUpperCase() === 'AM' && h === 12) h24 = 0;

            let [yr, mo, dy] = recommendationDate.split('-').map(Number);
            const nextDateTime = new Date(yr, mo - 1, dy, h24, m, 0);
            
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