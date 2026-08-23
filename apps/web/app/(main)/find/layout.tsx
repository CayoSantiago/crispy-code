export default function FindLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='grid grid-cols-1 gap-6 w-full max-w-7xl'>{children}</div>
  )
}
