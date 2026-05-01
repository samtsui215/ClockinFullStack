// app/(auth)/sign-in/page.tsx
import { getCurrentUser } from '@/lib/actions/auth.action';
import { redirect } from 'next/navigation';
import SignInForm from '@/components/auth/SignInForm';
import Image from 'next/image';
import { Lora } from 'next/font/google';

const lora = Lora({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
});

export default async function SignInPage() {
  const user = await getCurrentUser();
  
  if (user) {
    redirect('/'); 
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 flex items-center justify-center p-4 ${lora.className}`}>
      {/* Background Pattern */}
      <div 
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231c3260' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-0 bg-white rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-[#1c3260] via-[#2a4578] to-[#4062ad] p-12 relative overflow-hidden">
          {/* Decorative Blur Elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          {/* Content Container - Centered */}
          <div className="relative z-10 space-y-10">
            
            {/* Logo & Welcome Section */}
            <div className="text-center">
              <div className="relative h-48 w-full mb-8">
                <Image
                  src="/KLMTransparent.png"
                  alt="KLM Controls Logo"
                  fill
                  className="object-contain drop-shadow-2xl"
                  priority
                  sizes="450px"
                />
              </div>
              <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                Welcome Back
              </h1>
              <p className="text-blue-100 text-base leading-relaxed max-w-md mx-auto">
                Access your project management dashboard and track your team&apos;s progress in real-time.
              </p>
            </div>

            {/* Elegant Divider */}
            <div className="flex items-center justify-center">
              <div className="w-24 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
            </div>

            {/* Feature List - Better Spacing */}
            <div className="space-y-5 max-w-sm mx-auto">
              {[
                { 
                  title: "Project Tracking", 
                  desc: "Monitor all projects and tasks",
                  icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                },
                { 
                  title: "Time Tracking", 
                  desc: "Clock in and track project hours",
                  icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                },
                { 
                  title: "Team Collaboration", 
                  desc: "Work together with shared updates",
                  icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857"
                }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4 group">
                  <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-all group-hover:scale-105">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-base mb-1">{feature.title}</h3>
                    <p className="text-blue-100/80 text-sm">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Decorative Line */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        </div>

        {/* Right Side - Sign In Form */}
        <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-16">
          <div className="lg:hidden mb-8">
            <div className="relative w-64 h-24 mx-auto">
              <Image
                src="/KLMTransparent.png"
                alt="KLM Controls Logo"
                fill
                className="object-contain"
                priority
                sizes="256px"
              />
            </div>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Sign In</h2>
            <p className="text-slate-600">Enter your KLM credentials</p>
          </div>

          <SignInForm />

          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-sm text-slate-500">Protected by Firebase security</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-0 right-0 text-center">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} KLM Controls. All rights reserved.
        </p>
      </div>
    </div>
  );
}