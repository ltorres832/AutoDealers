'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      category: 'General',
      questions: [
        {
          q: '¿Qué es AutoDealers?',
          a: 'AutoDealers es una plataforma completa de gestión para concesionarios que incluye CRM, inventario, marketing automatizado, IA integrada y más, todo en un solo lugar.',
        },
        {
          q: '¿Necesito conocimientos técnicos para usar AutoDealers?',
          a: 'No, AutoDealers está diseñado para ser intuitivo y fácil de usar. Nuestro equipo también ofrece entrenamiento y soporte para ayudarte a comenzar.',
        },
        {
          q: '¿Puedo probar antes de comprar?',
          a: 'Sí, ofrecemos una prueba gratuita de 14 días sin necesidad de tarjeta de crédito. Puedes explorar todas las características durante este período.',
        },
      ],
    },
    {
      category: 'Precios y Planes',
      questions: [
        {
          q: '¿Puedo cambiar de plan después?',
          a: 'Sí, puedes actualizar o degradar tu plan en cualquier momento desde el dashboard. Los cambios se aplican inmediatamente y se prorratean.',
        },
        {
          q: '¿Hay descuentos por pago anual?',
          a: 'Sí, ofrecemos 2 meses gratis al pagar anualmente. Contacta a nuestro equipo de ventas para más información sobre planes anuales.',
        },
        {
          q: '¿Qué pasa si excedo los límites de mi plan?',
          a: 'Te notificaremos cuando te acerques a los límites. Puedes actualizar tu plan o comprar add-ons según necesites. No bloqueamos tu cuenta.',
        },
        {
          q: '¿Hay costos ocultos?',
          a: 'No, todos los precios son transparentes. El único costo adicional sería si eliges características premium o servicios adicionales como entrenamiento personalizado.',
        },
      ],
    },
    {
      category: 'Características',
      questions: [
        {
          q: '¿La IA funciona automáticamente?',
          a: 'Sí, una vez configurada, la IA puede responder automáticamente a clientes, clasificar leads y generar contenido. También puedes revisar y aprobar antes de publicar.',
        },
        {
          q: '¿Puedo integrar con mi sitio web existente?',
          a: 'Sí, AutoDealers ofrece API completa y webhooks para integrar con sistemas existentes. También puedes usar nuestro sitio web incluido.',
        },
        {
          q: '¿Cómo funciona la publicación en redes sociales?',
          a: 'Conectas tus cuentas de Facebook e Instagram, y AutoDealers puede publicar automáticamente o programar posts. También analiza el engagement y optimiza el contenido.',
        },
        {
          q: '¿Puedo personalizar el CRM?',
          a: 'Sí, puedes personalizar campos, etapas del pipeline, recordatorios y más según las necesidades específicas de tu negocio.',
        },
      ],
    },
    {
      category: 'Soporte',
      questions: [
        {
          q: '¿Qué tipo de soporte incluye?',
          a: 'Todos los planes incluyen soporte por email. Los planes Professional y Enterprise incluyen soporte prioritario, chat en vivo y gerente dedicado.',
        },
        {
          q: '¿Ofrecen entrenamiento?',
          a: 'Sí, ofrecemos documentación completa, videos tutoriales y webinars. Los planes Enterprise incluyen entrenamiento personalizado.',
        },
        {
          q: '¿Hay comunidad de usuarios?',
          a: 'Sí, tenemos un foro de comunidad donde los usuarios comparten consejos, mejores prácticas y ayudan entre sí.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AD</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AutoDealers
              </span>
            </Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">
            Preguntas{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Frecuentes
            </span>
          </h1>
          <p className="text-xl text-gray-600">
            Encuentra respuestas a las preguntas más comunes sobre AutoDealers
          </p>
        </div>

        <div className="space-y-8">
          {faqs.map((category, catIndex) => (
            <div key={catIndex} className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-2xl font-bold mb-6">{category.category}</h2>
              <div className="space-y-4">
                {category.questions.map((faq, qIndex) => {
                  const index = `${catIndex}-${qIndex}`;
                  const isOpen = openIndex === parseInt(index);
                  return (
                    <div key={qIndex} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                      <button
                        onClick={() => setOpenIndex(isOpen ? null : parseInt(index))}
                        className="w-full text-left flex justify-between items-center py-4 hover:text-blue-600 transition-colors"
                      >
                        <h3 className="font-semibold text-lg pr-8">{faq.q}</h3>
                        <svg
                          className={`w-6 h-6 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <p className="text-gray-600 pb-4 pl-2">{faq.a}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-4">¿No encontraste tu respuesta?</h2>
          <p className="mb-6 opacity-90">Nuestro equipo está listo para ayudarte</p>
          <Link
            href="/contacto"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg hover:shadow-xl transition-all font-semibold"
          >
            Contactar Soporte
          </Link>
        </div>
      </div>
    </div>
  );
}


