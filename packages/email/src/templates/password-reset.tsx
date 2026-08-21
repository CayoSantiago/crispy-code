import { Button, Heading, Text } from 'react-email'
import { EmailLayout } from '#templates/layout'

const button = {
  backgroundColor: '#18181b',
  borderRadius: '6px',
  color: '#fafafa',
  display: 'inline-block',
  fontSize: '14px',
  fontWeight: '600',
  lineHeight: '100%',
  padding: '12px 20px',
  textDecoration: 'none',
}

export type PasswordResetEmailProps = {
  name: string
  url: string
}

export function PasswordResetEmail({ name, url }: PasswordResetEmailProps) {
  return (
    <EmailLayout preview='Reset your Crispy Code password'>
      <Heading as='h1' style={{ fontSize: '20px', margin: '0 0 16px' }}>
        Reset your password
      </Heading>
      <Text style={{ color: '#3f3f46', fontSize: '14px', lineHeight: '22px' }}>
        Hi {name}, we received a request to reset your Crispy Code password.
        Click the button below to choose a new one.
      </Text>
      <Button href={url} style={button}>
        Reset password
      </Button>
      <Text style={{ color: '#71717a', fontSize: '12px', lineHeight: '20px' }}>
        If you did not request this, you can ignore this email. This link will
        expire.
      </Text>
    </EmailLayout>
  )
}

PasswordResetEmail.PreviewProps = {
  name: 'Ada Lovelace',
  url: 'http://localhost:3000/reset-password',
} satisfies PasswordResetEmailProps

export default PasswordResetEmail
