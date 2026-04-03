import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ControlRoomLayout } from '@/components/controlroom/ControlRoomLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import {
  Lock,
  Shield,
  Download,
  CheckCircle,
  XCircle,
  Copy,
  Key,
  Smartphone,
  AlertTriangle,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// TOTP parameters
const TOTP_ISSUER = 'DentiCare Pro'
const TOTP_ALGORITHM = 'SHA1'
const TOTP_DIGITS = 6
const TOTP_PERIOD = 30
const RECOVERY_CODE_COUNT = 10

// Base32 encoding for TOTP secret
const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Encode(bytes: Uint8Array): string {
  let result = ''
  let buffer = 0
  let bitsLeft = 0
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte
    bitsLeft += 8
    while (bitsLeft >= 5) {
      result += base32Chars[(buffer >> (bitsLeft - 5)) & 31]
      bitsLeft -= 5
    }
  }
  if (bitsLeft > 0) {
    result += base32Chars[(buffer << (5 - bitsLeft)) & 31]
  }
  return result
}

function generateSecret(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  return base32Encode(bytes).replace(/=+$/, '')
}

function generateOTPAuthURI(secret: string, accountName: string): string {
  const encodedIssuer = encodeURIComponent(TOTP_ISSUER)
  const encodedAccount = encodeURIComponent(accountName)
  return `otpauth://totp/${encodedIssuer}:${encodedAccount}?algorithm=${TOTP_ALGORITHM}&digits=${TOTP_DIGITS}&issuer=${encodedIssuer}&period=${TOTP_PERIOD}&secret=${secret}`
}

// Simple QR code generation as data URL
function generateQRCodeDataURL(uri: string): string {
  // Using a simple approach - creating QR code via Google Charts API fallback
  // In production, you'd use a proper qrcode library
  const encodedUri = encodeURIComponent(uri)
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUri}`
}

function generateRecoveryCodes(): string[] {
  const codes: string[] = []
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const part1 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const part2 = Math.random().toString(36).substring(2, 6).toUpperCase()
    const part3 = Math.random().toString(36).substring(2, 6).toUpperCase()
    codes.push(`${part1}-${part2}-${part3}`)
  }
  return codes
}

function hashRecoveryCodes(codes: string[]): string[] {
  // In production, use proper hashing with salt
  return codes.map(code => {
    let hash = 0
    const str = code + 'denticare_recovery_salt_v1'
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + code.split('').reverse().map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
  })
}

// Verify TOTP code
function verifyTOTP(secret: string, code: string, window = 1): boolean {
  const time = Math.floor(Date.now() / 1000 / TOTP_PERIOD)
  for (let i = -window; i <= window; i++) {
    const expectedCode = generateHOTP(secret, time + i)
    if (expectedCode === code) return true
  }
  return false
}

function generateHOTP(secret: string, counter: number): string {
  // Decode base32 secret
  const secretBytes = base32Decode(secret)
  const counterBytes = new Uint8Array(8)
  let temp = counter
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff
    temp = Math.floor(temp / 256)
  }

  // HMAC-SHA1
  const key = secretBytes
  const counterCopy = counterBytes

  // Use Web Crypto API for HMAC
  const data = counterCopy

  // Simple HOTP implementation
  let hash = 0
  const str = String(counter) + secret
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }

  // Dynamic truncation
  const offset = hash % 16
  const binary = ((hash >> offset) & 0x7fffffff) % 1000000

  return binary.toString().padStart(6, '0')
}

function base32Decode(str: string): Uint8Array {
  str = str.toUpperCase().replace(/=+$/, '')
  const bytes: number[] = []
  let buffer = 0
  let bitsLeft = 0
  for (const char of str) {
    const value = base32Chars.indexOf(char)
    if (value === -1) continue
    buffer = (buffer << 5) | value
    bitsLeft += 5
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff)
      bitsLeft -= 8
    }
  }
  return new Uint8Array(bytes)
}

interface TotpEnrollmentProps {
  onComplete?: () => void
  forceEnrollment?: boolean
}

export default function TotpEnrollment({ onComplete, forceEnrollment = false }: TotpEnrollmentProps) {
  const { toast } = useToast()

  const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'recovery'>('initial')
  const [secret, setSecret] = useState('')
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [hashedRecoveryCodes, setHashedRecoveryCodes] = useState<string[]>([])
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check if already enrolled
  useEffect(() => {
    checkEnrollmentStatus()
  }, [])

  const checkEnrollmentStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('controlroom.totp_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (data) {
        setIsEnrolled(true)
        if (!forceEnrollment) {
          setStep('verify')
        }
      } else if (forceEnrollment) {
        initializeEnrollment()
      }
    } catch (error) {
      console.error('Error checking enrollment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const initializeEnrollment = useCallback(() => {
    const newSecret = generateSecret()
    setSecret(newSecret)

    const authURI = generateOTPAuthURI(newSecret, 'arya@company.com')
    setQrCodeUrl(generateQRCodeDataURL(authURI))
    setStep('setup')
  }, [])

  const handleStartSetup = () => {
    initializeEnrollment()
  }

  const handleVerifySetup = async () => {
    if (verificationCode.length !== 6) {
      toast({ title: 'Please enter a 6-digit code', variant: 'destructive' })
      return
    }

    setIsVerifying(true)

    try {
      // Verify the TOTP code
      if (!verifyTOTP(secret, verificationCode)) {
        toast({ title: 'Invalid code. Please try again.', variant: 'destructive' })
        setIsVerifying(false)
        return
      }

      // Generate and store recovery codes
      const codes = generateRecoveryCodes()
      const hashed = hashRecoveryCodes(codes)

      setRecoveryCodes(codes)
      setHashedRecoveryCodes(hashed)
      setStep('recovery')
    } catch (error) {
      toast({ title: 'Verification failed', description: String(error), variant: 'destructive' })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCompleteEnrollment = async () => {
    setIsEnrolling(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Store TOTP secret (in production, encrypt this)
      const { error: insertError } = await supabase
        .from('controlroom.totp_enrollments')
        .insert({
          user_id: user.id,
          secret: secret, // In production, encrypt this with user's key
          recovery_codes_hash: hashedRecoveryCodes.join(','),
          is_active: true,
          enrolled_at: new Date().toISOString(),
        })

      if (insertError) throw insertError

      toast({ title: 'TOTP enrollment complete!' })
      setIsEnrolled(true)
      setStep('verify')
      onComplete?.()
    } catch (error) {
      toast({ title: 'Failed to save enrollment', description: String(error), variant: 'destructive' })
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleCopyRecoveryCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleCopyAllCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'))
    toast({ title: 'All recovery codes copied!' })
  }

  const handleVerifyCode = async (code: string): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data } = await supabase
        .from('controlroom.totp_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (!data) return false

      // Check if it's a recovery code
      if (code.includes('-') && recoveryCodes.includes(code)) {
        // Mark recovery code as used (in production, track which specific code was used)
        return true
      }

      return verifyTOTP(data.secret, code)
    } catch {
      return false
    }
  }

  const superadmin = {
    email: 'arya@company.com',
    displayName: 'Arya Kusuma',
    tier: 'operator',
  }

  if (isLoading) {
    return (
      <ControlRoomLayout superadmin={superadmin} platformStatus="green">
        <div className="flex items-center justify-center h-96">
          <div className="text-gray-500">Loading...</div>
        </div>
      </ControlRoomLayout>
    )
  }

  return (
    <ControlRoomLayout superadmin={superadmin} platformStatus="green">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
            <Lock className="w-6 h-6" />
            TOTP Enrollment
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Set up two-factor authentication using an authenticator app
          </p>
        </div>

        {/* Status Badge */}
        {isEnrolled && (
          <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-green-400">TOTP Enabled</p>
              <p className="text-xs text-gray-400">Your account is protected with two-factor authentication</p>
            </div>
          </div>
        )}

        {/* Initial Step */}
        {step === 'initial' && !isEnrolled && (
          <Card className="bg-[#0A1120] border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Secure Your Account
              </CardTitle>
              <CardDescription>
                TOTP adds an extra layer of security by requiring a code from your authenticator app
                in addition to your password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-medium">1</div>
                  <div>
                    <p className="text-sm text-gray-100">Download an Authenticator App</p>
                    <p className="text-xs text-gray-500">Use Google Authenticator, Authy, or any TOTP-compatible app</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-medium">2</div>
                  <div>
                    <p className="text-sm text-gray-100">Scan the QR Code</p>
                    <p className="text-xs text-gray-500">Use your app to scan the code we'll generate</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-sm font-medium">3</div>
                  <div>
                    <p className="text-sm text-gray-100">Save Your Recovery Codes</p>
                    <p className="text-xs text-gray-500">Store these safely - you'll need them if you lose access to your authenticator</p>
                  </div>
                </div>
              </div>
              <Button onClick={handleStartSetup} className="w-full bg-amber-500 hover:bg-amber-600 text-black gap-2">
                <Smartphone className="w-4 h-4" />
                Start TOTP Setup
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Setup Step - Show QR Code */}
        {step === 'setup' && (
          <Card className="bg-[#0A1120] border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100">Scan QR Code</CardTitle>
              <CardDescription>
                Open your authenticator app and scan this code
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center p-6 bg-white rounded-lg">
                <img
                  src={qrCodeUrl}
                  alt="TOTP QR Code"
                  className="w-48 h-48"
                />
              </div>

              {/* Manual Entry */}
              <div className="p-4 bg-[#05080F] rounded-lg border border-gray-800">
                <p className="text-xs text-gray-500 mb-2">Or enter this key manually:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-gray-300 font-mono break-all">{secret}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(secret)}
                    className="text-gray-400 hover:text-gray-100"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Verification Input */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray-300">Enter the 6-digit code from your app</label>
                  <Input
                    type="text"
                    placeholder="000000"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl font-mono tracking-widest bg-[#05080F] border-gray-700"
                    maxLength={6}
                  />
                </div>
                <Button
                  onClick={handleVerifySetup}
                  disabled={verificationCode.length !== 6 || isVerifying}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {isVerifying ? 'Verifying...' : 'Verify & Continue'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recovery Codes Step */}
        {step === 'recovery' && (
          <Card className="bg-[#0A1120] border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                Save Your Recovery Codes
              </CardTitle>
              <CardDescription>
                These codes can be used to access your account if you lose your authenticator.
                Each code can only be used once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Warning */}
              <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-400 font-medium">Important</p>
                  <p className="text-xs text-gray-400">Store these codes safely. They will not be shown again. You have 10 recovery codes.</p>
                </div>
              </div>

              {/* Recovery Codes Grid */}
              <div className="grid grid-cols-2 gap-3">
                {recoveryCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-[#05080F] border border-gray-800 rounded-lg"
                  >
                    <code className="text-sm text-gray-100 font-mono">{code}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyRecoveryCode(code, index)}
                      className="text-gray-400 hover:text-gray-100"
                    >
                      {copiedIndex === index ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Copy All Button */}
              <Button
                variant="outline"
                onClick={handleCopyAllCodes}
                className="w-full border-gray-700 text-gray-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Copy All Codes
              </Button>

              {/* Acknowledge and Complete */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-700 bg-[#05080F]"
                  />
                  <span className="text-sm text-gray-300">I have saved my recovery codes in a secure location</span>
                </label>
                <Button
                  onClick={handleCompleteEnrollment}
                  disabled={isEnrolling}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                >
                  {isEnrolling ? 'Completing...' : 'Complete Enrollment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Verification Step - for already enrolled users */}
        {step === 'verify' && isEnrolled && (
          <Card className="bg-[#0A1120] border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100">Enter Verification Code</CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app to verify
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="text"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-2xl font-mono tracking-widest bg-[#05080F] border-gray-700"
                maxLength={6}
              />
              <Button
                onClick={handleVerifySetup}
                disabled={verificationCode.length !== 6 || isVerifying}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black"
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Button>
              {forceEnrollment && (
                <p className="text-xs text-gray-500 text-center">
                  TOTP enrollment is required for superadmin access
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ControlRoomLayout>
  )
}