export function isEmailSendingEnabled(context?: string) {
  return context !== 'deploy-preview' && context !== 'branch-deploy'
}
