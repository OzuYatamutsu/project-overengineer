import Image from 'next/image'
import Link from 'next/link'
import ExpandingArrow from '@/components/expanding-arrow'
import Uploader from '@/components/uploader'
import { Toaster } from '@/components/toaster'

export default function Home() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center">
      <Toaster />
      <h1 className="pt-4 pb-2 bg-gradient-to-br from-black via-[#171717] to-[#575757] bg-clip-text text-center text-4xl font-medium tracking-tight text-transparent md:text-7xl">
        Receipt Parser
      </h1>
      <p className="font-light text-gray-600 w-full max-w-lg text-center pb-7">Parse text from a picture of a receipt.</p>
      <div className="bg-white/30 p-12 shadow-xl ring-1 ring-gray-900/5 rounded-lg backdrop-blur-lg max-w-xl mx-auto w-full">
        <Uploader />
      </div>
      <div className="sm:absolute sm:bottom-0 w-full px-20 py-10 flex justify-between">
      </div>
    </main>
  )
}
