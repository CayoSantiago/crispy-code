import { z } from 'zod/v4'

export const passwordSchema = z
  .string()
  .trim()
  .min(1, 'Enter your password')
  .min(8, 'Must be at least 8 characters long')

export const signinSchema = z.object({
  email: z.email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name'),
  email: z.email('Enter a valid email'),
  password: passwordSchema,
})

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email'),
})

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, 'This reset link is invalid or has expired'),
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export function formString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}
