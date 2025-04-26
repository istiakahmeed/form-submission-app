import type { Metadata } from "next";
import SubmissionForm from "@/components/submission-form";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Form Submission App",
  description: "Submit your information and we'll get back to you",
};

export default function Home() {
  return (
    <>
      <nav className='bg-slate-100 p-4 flex justify-between items-center shadow-sm'>
        <h2 className='font-semibold text-lg'>Form Submission App</h2>
        <Link
          href='/admin'
          className='bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors'
        >
          Admin Dashboard
        </Link>
      </nav>
      <main className='min-h-screen flex flex-col items-center justify-center p-4 md:p-24'>
        <div className='w-full max-w-2xl mx-auto'>
          <div className='text-center mb-8'>
            <h1 className='text-3xl font-bold tracking-tight'>Contact Us</h1>
            <p className='text-muted-foreground mt-2'>
              Fill out the form below and we'll get back to you as soon as
              possible.
            </p>
          </div>
          <SubmissionForm />
        </div>
      </main>
    </>
  );
}
