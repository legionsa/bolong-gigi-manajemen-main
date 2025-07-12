
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BarChart, DollarSign, Users } from 'lucide-react';

const Landing = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Link to="/" className="mr-6 flex items-center space-x-2">
            <span className="font-bold sm:inline-block">
              Klinik Gigi Sehat
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium ml-auto">
            <Link
              to="/login"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Login
            </Link>
            <Button asChild>
              <Link to="/register">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-r from-primary to-primary-foreground/10">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
            <div className="flex flex-col justify-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-primary-foreground">
                  Manajemen Klinik Gigi Modern & Efisien
                </h1>
                <p className="max-w-[600px] text-primary-foreground/80 md:text-xl">
                  Solusi lengkap untuk mengelola jadwal, pasien, staf, dan keuangan klinik gigi Anda. Tingkatkan produktivitas dan berikan pelayanan terbaik.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button size="lg" asChild>
                  <Link to="/register">
                    Coba Gratis Sekarang <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" asChild>
                  <Link to="#features">
                    Pelajari Fitur
                  </Link>
                </Button>
              </div>
            </div>
            {/* Placeholder for an image or illustration */}
            <img
              alt="Hero Illustration"
              className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square"
              height="550"
              src="/placeholder.svg" // Replace with actual image path
              width="550"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="w-full py-12 md:py-24 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">
                Fitur Unggulan
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                Semua yang Anda Butuhkan dalam Satu Platform
              </h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Dari penjadwalan janji temu hingga manajemen tagihan, kami menyediakan alat yang Anda butuhkan untuk menjalankan klinik gigi yang sukses.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:gap-16 mt-12">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6 text-primary" /> Manajemen Pasien</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Kelola data pasien, riwayat medis, dan janji temu dengan mudah.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart className="h-6 w-6 text-primary" /> Penjadwalan Cerdas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Atur jadwal dokter dan janji temu pasien secara efisien untuk menghindari bentrokan.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-6 w-6 text-primary" /> Manajemen Keuangan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Lacak tagihan, pembayaran, dan laporan keuangan klinik Anda secara terintegrasi.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section - Optional */}
      <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
              Dipercaya oleh Klinik Gigi di Seluruh Negeri
            </h2>
            <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Bergabunglah dengan ratusan klinik yang telah merasakan manfaat dari platform kami.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm space-y-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center">
                <p className="text-4xl font-bold">500+</p>
                <p className="text-sm text-muted-foreground">Klinik Terdaftar</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-4xl font-bold">10k+</p>
                <p className="text-sm text-muted-foreground">Pasien Dilayani</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <p className="text-4xl font-bold">98%</p>
                <p className="text-sm text-muted-foreground">Kepuasan Pengguna</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 lg:py-32 border-t">
        <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
          <div className="space-y-3">
            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
              Siap Mengoptimalkan Klinik Gigi Anda?
            </h2>
            <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Daftar sekarang dan rasakan kemudahan mengelola klinik Anda dengan teknologi terkini.
            </p>
          </div>
          <div className="mx-auto w-full max-w-sm space-y-2">
            <Button size="lg" asChild>
              <Link to="/register">
                Mulai Sekarang <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Klinik Gigi Sehat. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" to="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" to="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
};

export default Landing;
