import { Button, Heading, Text } from 'react-email'
import { EmailLayout } from '#templates/layout'
import { bodyText, button, mutedText } from '#templates/styles'

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
      <Text style={bodyText}>
        Hi {name}, confirm this address to finish setting up your Crispy Code
        account.
      </Text>
      <Button href={url} style={button}>
        Verify email
      </Button>
      <Text style={mutedText}>
        If the button does not work, paste this URL into your browser:
        {url}
      </Text>
      <Text style={mutedText}>
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
