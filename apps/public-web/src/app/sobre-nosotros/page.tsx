'use client';

import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';

export default function SobreNosotrosPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AD</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-600 bg-clip-text text-transparent">
                AutoDealers
              </span>
            </Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-primary-600 to-primary-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-8 flex flex-wrap items-center gap-3 gap-y-2">
          <PublicBackButton className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver
          </PublicBackButton>
          <span className="text-gray-300 hidden sm:inline">|</span>
          <Link href="/" className="text-sm text-gray-500 hover:text-primary-600">
            Inicio
          </Link>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Sobre{' '}
            <span className="bg-gradient-to-r from-primary-600 to-primary-600 bg-clip-text text-transparent">
              Nosotros
            </span>
          </h1>
          <p className="text-xl text-gray-600">
            Transformando la industria automotriz con tecnología de vanguardia
          </p>
        </div>

        <div className="space-y-12">
          {/* Mission */}
          <section className="bg-gradient-to-br from-primary-50 to-primary-50 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-4">Nuestra Misión</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              En AutoDealers, creemos que cada concesionario merece herramientas profesionales para 
              competir en el mercado actual. Nuestra misión es democratizar el acceso a tecnología 
              avanzada de gestión, permitiendo que concesionarios de todos los tamaños puedan 
              optimizar sus operaciones, aumentar sus ventas y mejorar la experiencia de sus clientes.
            </p>
          </section>

          {/* Story */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Nuestra Historia</h2>
            <div className="space-y-6 text-gray-700 leading-relaxed">
              <p>
                AutoDealers nació en 2020 cuando un grupo de emprendedores identificó las 
                dificultades que enfrentaban los concesionarios para gestionar sus operaciones 
                de manera eficiente. Muchos dependían de sistemas obsoletos o múltiples herramientas 
                desconectadas que complicaban su trabajo diario.
              </p>
              <p>
                Decidimos crear una solución integral que combinara CRM, inventario, marketing 
                y más en una sola plataforma intuitiva. Con el tiempo, incorporamos inteligencia 
                artificial y automatización para hacer que la gestión sea aún más eficiente.
              </p>
              <p>
                Hoy, AutoDealers es utilizado por más de 500 concesionarios en todo el mundo, 
                ayudándolos a vender más de 50,000 vehículos y mejorando significativamente 
                sus operaciones.
              </p>
            </div>
          </section>

          {/* Values */}
          <section className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-3xl font-bold mb-8">Nuestros Valores</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {[
                {
                  icon: '🎯',
                  title: 'Enfoque en el Cliente',
                  description: 'Cada decisión que tomamos está centrada en ayudar a nuestros clientes a tener éxito.',
                },
                {
                  icon: '🚀',
                  title: 'Innovación Constante',
                  description: 'Nos esforzamos por estar a la vanguardia de la tecnología y las mejores prácticas.',
                },
                {
                  icon: '🤝',
                  title: 'Transparencia',
                  description: 'Creemos en la comunicación abierta y honesta con nuestros clientes y equipo.',
                },
                {
                  icon: '💪',
                  title: 'Excelencia',
                  description: 'Nos comprometemos a entregar productos y servicios de la más alta calidad.',
                },
              ].map((value, i) => (
                <div key={i} className="bg-white rounded-xl p-6">
                  <div className="text-4xl mb-4">{value.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                  <p className="text-gray-600">{value.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Team */}
          <section>
            <h2 className="text-3xl font-bold mb-6">Nuestro Equipo</h2>
            <p className="text-lg text-gray-700 mb-8">
              Somos un equipo diverso de desarrolladores, diseñadores, especialistas en marketing 
              y expertos en la industria automotriz, todos unidos por la pasión de crear la mejor 
              plataforma para concesionarios.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { name: 'Equipo de Desarrollo', count: '25+' },
                { name: 'Soporte al Cliente', count: '15+' },
                { name: 'Ventas y Marketing', count: '10+' },
              ].map((team, i) => (
                <div key={i} className="bg-gradient-to-br from-primary-50 to-primary-50 rounded-xl p-6 text-center">
                  <div className="text-3xl font-bold text-primary-600 mb-2">{team.count}</div>
                  <div className="text-gray-700">{team.name}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-primary-600 to-primary-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">¿Quieres unirte a nuestro equipo?</h2>
          <p className="text-xl mb-8 opacity-90">
            Estamos siempre buscando talento excepcional
          </p>
          <Link
            href="/contacto"
            className="inline-block bg-white text-primary-600 px-8 py-4 rounded-lg hover:shadow-xl transition-all font-semibold text-lg"
          >
            Ver Oportunidades
          </Link>
        </div>
      </div>
    </div>
  );
}


