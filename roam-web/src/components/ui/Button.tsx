import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: 'primary' | 'light' | 'ghost' | 'icon' }

export function Button({ children, variant = 'primary', className = '', ...props }: Props) {
  const styles = {
    primary: 'bg-ocean text-white hover:bg-[#0e4b66] shadow-sm',
    light: 'bg-paper !text-ocean hover:bg-mist shadow-sm',
    ghost: 'border border-ocean text-ocean hover:bg-mist',
    icon: 'text-muted hover:bg-mist hover:text-ocean',
  }
  return <button className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${styles[variant]} ${className}`} {...props}>{children}</button>
}
