export default function FindLayout({ children }: LayoutProps<'/find'>) {
  return (
    <main className='p-6'>
      <div className='grid w-full max-w-7xl grid-cols-1 gap-6'>{children}</div>
    </main>
  )
}
