import { Button, Heading, Text } from 'react-email'
import { EmailLayout } from '#templates/layout'
import { bodyText, button, mutedText } from '#templates/styles'

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
      <Text style={bodyText}>
        Hi {name}, we received a request to reset your Crispy Code password.
        Click the button below to choose a new one.
      </Text>
      <Button href={url} style={button}>
        Reset password
      </Button>
      <Text style={mutedText}>
        If the button does not work, paste this URL into your browser:
        {url}
      </Text>
      <Text style={mutedText}>
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
