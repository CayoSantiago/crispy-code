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

export type EmailVerificationEmailProps = {
  name: string
  url: string
}

export function EmailVerificationEmail({
  name,
  url,
}: EmailVerificationEmailProps) {
  return (
    <EmailLayout preview='Verify your Crispy Code email'>
      <Heading as='h1' style={{ fontSize: '20px', margin: '0 0 16px' }}>
        Verify your email
      </Heading>
      <Text style={{ color: '#3f3f46', fontSize: '14px', lineHeight: '22px' }}>
        Hi {name}, confirm this address to finish setting up your Crispy Code
        account.
      </Text>
      <Button href={url} style={button}>
        Verify email
      </Button>
      <Text style={{ color: '#71717a', fontSize: '12px', lineHeight: '20px' }}>
        If you did not create an account, you can ignore this email.
      </Text>
    </EmailLayout>
  )
}

EmailVerificationEmail.PreviewProps = {
  name: 'Ada Lovelace',
  url: 'http://localhost:3000/verify-email',
} satisfies EmailVerificationEmailProps

export default EmailVerificationEmail
