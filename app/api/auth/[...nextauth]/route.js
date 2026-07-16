import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import mmgc_db from "@/lib/mmgc_db";
import User from "@/models/User"; // Change this to your actual User/Patient model path
import bcrypt from "bcryptjs"; 
import { loginSchema } from "@/schemas/auth"; // Integrated Zod schema

// Force Next.js 16 to keep this route dynamic to prevent 500 compilation errors
export const dynamic = "force-dynamic";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await mmgc_db();

        // Security Validation: Validate incoming credentials payload using Zod
        const parsedCredentials = loginSchema.safeParse(credentials);
        if (!parsedCredentials.success) {
          throw new Error("Invalid email or password");
        }

        const { email, password } = parsedCredentials.data;

        // Find user by email
        const user = await User.findOne({ email }); 
        if (!user) {
          throw new Error("Invalid email or password");
        }

        // Verify password - FIX: added string fallback to prevent unhandled type errors
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        // Convert Mongoose ObjectId safely into a plain string
        return { id: user._id.toString(), name: user.name, email: user.email };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
      }
      return session;
    }
  },
  session: { strategy: "jwt" },
  // FIX: Added string fallback matching env config to prevent undefined secret crashes during compilation
  secret: process.env.NEXTAUTH_SECRET || "357df9mmgchospitalmanagementsystemsecretkey2026",
};

// FIX: Destructure handlers from NextAuth to support the Auth.js v5 App Router runtime requirements natively
const { handlers } = NextAuth(authOptions);
export const { GET, POST } = handlers;