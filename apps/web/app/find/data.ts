import { readFindConfig } from '@/lib/find/config'

export async function getFindConfigData() {
  return readFindConfig()
}
