import { Toaster } from 'sonner'

import { useTheme } from '../../hooks/use-theme'

export function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme} richColors />
}
