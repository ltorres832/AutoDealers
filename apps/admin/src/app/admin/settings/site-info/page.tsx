'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SiteInfo {
  name: string;
  description: string;
  logo: string;
  contact: {
    phone: string;
    email: string;
    address: string;
    hours: string;
    whatsapp: string;
  };
  copyright: {
    year: number;
    company: string;
    text: string;
  };
  disclaimer: string;
  footerLinks: {
    navigation: Array<{ label: string; href: string }>;
    legal: Array<{ label: string; href: string }>;
  };
  statistics?: {
    satisfiedCustomers: string;
    averageRating: string;
    satisfactionRate: string;
    verifiedVehicles?: string;
    certifiedDealers?: string;
    warrantyIncluded?: string;
    supportAvailable?: string;
  };
  statisticsVisibility?: {
    satisfiedCustomers: boolean;
    averageRating: boolean;
    satisfactionRate: boolean;
    verifiedVehicles?: boolean;
    certifiedDealers?: boolean;
    warrantyIncluded?: boolean;
    supportAvailable?: boolean;
  };
  visibility?: {
    name: boolean;
    description: boolean;
    logo: boolean;
    contact: {
      phone: boolean;
      email: boolean;
      address: boolean;
      hours: boolean;
      whatsapp: boolean;
    };
    copyright: {
      year: boolean;
      company: boolean;
      text: boolean;
    };
    disclaimer: boolean;
  };
}

export default function SiteInfoSettingsPage() {
  const [siteInfo, setSiteInfo] = useState<SiteInfo>({
    name: 'AutoDealers',
    description: 'La plataforma completa para encontrar y comprar vehículos. Miles de opciones verificadas.',
    logo: 'AD',
    contact: {
      phone: '+1 (555) 123-4567',
      email: 'info@autodealers.com',
      address: '1234 Avenida Principal, Ciudad',
      hours: 'Lun-Vie: 9AM-7PM | Sáb: 9AM-5PM',
      whatsapp: '1234567890',
    },
    copyright: {
      year: 2025,
      company: 'AutoDealers',
      text: 'Todos los derechos reservados.',
    },
    disclaimer: 'Las promociones aumentan la visibilidad de los anuncios. No garantizan contactos ni ventas.',
    footerLinks: {
      navigation: [
        { label: 'Vehículos', href: '#vehicles' },
        { label: 'Promociones', href: '#promotions' },
        { label: 'Concesionarios', href: '#dealers' },
        { label: 'Contacto', href: '#contact' },
      ],
      legal: [
        { label: 'Privacidad', href: '/privacidad' },
        { label: 'Términos', href: '/terminos' },
        { label: 'Cookies', href: '/cookies' },
      ],
    },
    statistics: {
      satisfiedCustomers: '10,000+',
      averageRating: '4.9/5',
      satisfactionRate: '99.8%',
      verifiedVehicles: '',
      certifiedDealers: '',
      warrantyIncluded: '',
      supportAvailable: '',
    },
    statisticsVisibility: {
      satisfiedCustomers: true,
      averageRating: true,
      satisfactionRate: true,
      verifiedVehicles: true,
      certifiedDealers: true,
      warrantyIncluded: true,
      supportAvailable: true,
    },
    visibility: {
      name: true,
      description: true,
      logo: true,
      contact: {
        phone: true,
        email: true,
        address: true,
        hours: true,
        whatsapp: true,
      },
      copyright: {
        year: true,
        company: true,
        text: true,
      },
      disclaimer: true,
    },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSiteInfo();
  }, []);

  async function fetchSiteInfo() {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/site-info');
      if (response.ok) {
        const data = await response.json();
        if (data.siteInfo) {
          // Asegurar que visibility tenga valores por defecto si no existe
          const siteInfoData = data.siteInfo;
          if (!siteInfoData.visibility) {
            siteInfoData.visibility = {
              name: true,
              description: true,
              logo: true,
              contact: {
                phone: true,
                email: true,
                address: true,
                hours: true,
                whatsapp: true,
              },
              copyright: {
                year: true,
                company: true,
                text: true,
              },
              disclaimer: true,
            };
          }
          if (!siteInfoData.statisticsVisibility) {
            siteInfoData.statisticsVisibility = {
              satisfiedCustomers: true,
              averageRating: true,
              satisfactionRate: true,
            };
          }
          setSiteInfo(siteInfoData);
        }
      }
    } catch (error) {
      console.error('Error fetching site info:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSiteInfo() {
    try {
      setSaving(true);
      setMessage(null);
      const response = await fetch('/api/admin/settings/site-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteInfo }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Información del sitio guardada exitosamente' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Error al guardar' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Error al guardar' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/admin/settings" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
        ← Volver a Configuración
      </Link>
      
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Información del Sitio Público</h1>
        <p className="text-gray-600 mb-6">
          Configura la información que aparece en el footer y secciones de contacto del sitio público
        </p>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Información General */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Información General</h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Nombre del Sitio</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.name ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          name: e.target.checked,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.name}
                onChange={(e) => setSiteInfo({ ...siteInfo, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.description ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          description: e.target.checked,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <textarea
                value={siteInfo.description}
                onChange={(e) => setSiteInfo({ ...siteInfo, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Logo (Texto)</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.logo ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          logo: e.target.checked,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.logo}
                onChange={(e) => setSiteInfo({ ...siteInfo, logo: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="AD"
              />
              <p className="text-xs text-gray-500 mt-1">Texto que aparece en el logo del footer</p>
            </div>
          </div>
        </div>

        {/* Información de Contacto */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Información de Contacto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.contact?.phone ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          contact: {
                            ...siteInfo.visibility?.contact,
                            phone: e.target.checked,
                          } as any,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.contact.phone}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    contact: { ...siteInfo.contact, phone: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.contact?.email ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          contact: {
                            ...siteInfo.visibility?.contact,
                            email: e.target.checked,
                          } as any,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="email"
                value={siteInfo.contact.email}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    contact: { ...siteInfo.contact, email: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Dirección</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.contact?.address ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          contact: {
                            ...siteInfo.visibility?.contact,
                            address: e.target.checked,
                          } as any,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.contact.address}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    contact: { ...siteInfo.contact, address: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Horario</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.contact?.hours ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          contact: {
                            ...siteInfo.visibility?.contact,
                            hours: e.target.checked,
                          } as any,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.contact.hours}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    contact: { ...siteInfo.contact, hours: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Lun-Vie: 9AM-7PM | Sáb: 9AM-5PM"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.contact?.whatsapp ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          contact: {
                            ...siteInfo.visibility?.contact,
                            whatsapp: e.target.checked,
                          } as any,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.contact.whatsapp}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    contact: { ...siteInfo.contact, whatsapp: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="1234567890"
              />
              <p className="text-xs text-gray-500 mt-1">Número sin + ni espacios (ej: 1234567890)</p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Copyright</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Año</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.copyright?.year ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          copyright: {
                            ...siteInfo.visibility?.copyright,
                            year: e.target.checked,
                          } as any,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="number"
                value={siteInfo.copyright.year}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    copyright: { ...siteInfo.copyright, year: parseInt(e.target.value) },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Empresa</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.copyright?.company ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          copyright: {
                            ...siteInfo.visibility?.copyright,
                            company: e.target.checked,
                          } as any,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.copyright.company}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    copyright: { ...siteInfo.copyright, company: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Texto</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.visibility?.copyright?.text ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        visibility: {
                          ...siteInfo.visibility,
                          copyright: {
                            ...siteInfo.visibility?.copyright,
                            text: e.target.checked,
                          } as any,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.copyright.text}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    copyright: { ...siteInfo.copyright, text: e.target.value },
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Texto Legal (Disclaimer)</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={siteInfo.visibility?.disclaimer ?? true}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    visibility: {
                      ...siteInfo.visibility,
                      disclaimer: e.target.checked,
                    } as any,
                  })
                }
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">Mostrar</span>
            </label>
          </div>
          <textarea
            value={siteInfo.disclaimer}
            onChange={(e) => setSiteInfo({ ...siteInfo, disclaimer: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Estadísticas */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Estadísticas del Sitio</h2>
          <p className="text-sm text-gray-600 mb-4">
            Configura las estadísticas que se muestran en la página principal del sitio público. Si dejas un campo vacío, se calculará automáticamente desde la base de datos.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Clientes Satisfechos</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.statisticsVisibility?.satisfiedCustomers ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        statisticsVisibility: {
                          ...siteInfo.statisticsVisibility,
                          satisfiedCustomers: e.target.checked,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.statistics?.satisfiedCustomers || ''}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    statistics: {
                      ...siteInfo.statistics,
                      satisfiedCustomers: e.target.value,
                    } as any,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="10,000+"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Calificación Promedio</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.statisticsVisibility?.averageRating ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        statisticsVisibility: {
                          ...siteInfo.statisticsVisibility,
                          averageRating: e.target.checked,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.statistics?.averageRating || ''}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    statistics: {
                      ...siteInfo.statistics,
                      averageRating: e.target.value,
                    } as any,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="4.9/5"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Tasa de Satisfacción</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={siteInfo.statisticsVisibility?.satisfactionRate ?? true}
                    onChange={(e) =>
                      setSiteInfo({
                        ...siteInfo,
                        statisticsVisibility: {
                          ...siteInfo.statisticsVisibility,
                          satisfactionRate: e.target.checked,
                        } as any,
                      })
                    }
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-600">Mostrar</span>
                </label>
              </div>
              <input
                type="text"
                value={siteInfo.statistics?.satisfactionRate || ''}
                onChange={(e) =>
                  setSiteInfo({
                    ...siteInfo,
                    statistics: {
                      ...siteInfo.statistics,
                      satisfactionRate: e.target.value,
                    } as any,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="99.8%"
              />
            </div>
          </div>
          
          {/* Nuevas estadísticas */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-semibold mb-4">Estadísticas Adicionales</h3>
            <p className="text-sm text-gray-500 mb-4">
              Si dejas un campo vacío, se calculará automáticamente desde la base de datos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vehículos Verificados */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Vehículos Verificados</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteInfo.statisticsVisibility?.verifiedVehicles ?? true}
                      onChange={(e) =>
                        setSiteInfo({
                          ...siteInfo,
                          statisticsVisibility: {
                            ...siteInfo.statisticsVisibility,
                            verifiedVehicles: e.target.checked,
                          } as any,
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs text-gray-600">Mostrar</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={siteInfo.statistics?.verifiedVehicles || ''}
                  onChange={(e) =>
                    setSiteInfo({
                      ...siteInfo,
                      statistics: {
                        ...siteInfo.statistics,
                        verifiedVehicles: e.target.value,
                      } as any,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Dejar vacío para calcular automáticamente"
                />
                <p className="text-xs text-gray-500 mt-1">Se calculará desde vehículos disponibles si está vacío</p>
              </div>
              
              {/* Concesionarios Certificados */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Concesionarios Certificados</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteInfo.statisticsVisibility?.certifiedDealers ?? true}
                      onChange={(e) =>
                        setSiteInfo({
                          ...siteInfo,
                          statisticsVisibility: {
                            ...siteInfo.statisticsVisibility,
                            certifiedDealers: e.target.checked,
                          } as any,
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs text-gray-600">Mostrar</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={siteInfo.statistics?.certifiedDealers || ''}
                  onChange={(e) =>
                    setSiteInfo({
                      ...siteInfo,
                      statistics: {
                        ...siteInfo.statistics,
                        certifiedDealers: e.target.value,
                      } as any,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Dejar vacío para calcular automáticamente"
                />
                <p className="text-xs text-gray-500 mt-1">Se calculará desde dealers activos si está vacío</p>
              </div>
              
              {/* Garantía Incluida */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Garantía Incluida</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteInfo.statisticsVisibility?.warrantyIncluded ?? true}
                      onChange={(e) =>
                        setSiteInfo({
                          ...siteInfo,
                          statisticsVisibility: {
                            ...siteInfo.statisticsVisibility,
                            warrantyIncluded: e.target.checked,
                          } as any,
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs text-gray-600">Mostrar</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={siteInfo.statistics?.warrantyIncluded || ''}
                  onChange={(e) =>
                    setSiteInfo({
                      ...siteInfo,
                      statistics: {
                        ...siteInfo.statistics,
                        warrantyIncluded: e.target.value,
                      } as any,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Disponible"
                />
                <p className="text-xs text-gray-500 mt-1">Texto personalizado (ej: Disponible, 12 meses, Incluida, etc.)</p>
              </div>
              
              {/* Soporte Disponible */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Soporte Disponible</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={siteInfo.statisticsVisibility?.supportAvailable ?? true}
                      onChange={(e) =>
                        setSiteInfo({
                          ...siteInfo,
                          statisticsVisibility: {
                            ...siteInfo.statisticsVisibility,
                            supportAvailable: e.target.checked,
                          } as any,
                        })
                      }
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-xs text-gray-600">Mostrar</span>
                  </label>
                </div>
                <input
                  type="text"
                  value={siteInfo.statistics?.supportAvailable || ''}
                  onChange={(e) =>
                    setSiteInfo({
                      ...siteInfo,
                      statistics: {
                        ...siteInfo.statistics,
                        supportAvailable: e.target.value,
                      } as any,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Disponible"
                />
                <p className="text-xs text-gray-500 mt-1">Texto personalizado (ej: Disponible, Lun-Vie 9AM-5PM, etc.)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end">
          <button
            onClick={saveSiteInfo}
            disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}


