'use client';

import Link from 'next/link';

export default function LandingFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-slate-900 border-t border-slate-800 pt-20 pb-10 overflow-hidden relative">
            {/* Decorative patterns */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-20">
                    {/* Logo & Vision */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                                <span className="text-white font-black text-2xl tracking-tighter">AD</span>
                            </div>
                            <div>
                                <span className="block text-2xl font-black text-white tracking-tighter leading-none">AutoDealers</span>
                                <span className="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Marketplace Premium</span>
                            </div>
                        </div>

                        <p className="text-slate-400 text-lg leading-relaxed font-medium">
                            Reinventando la compra de vehículos con tecnología de punta, transparencia total y una red de socios certificados de confianza.
                        </p>

                        <div className="flex items-center gap-4">
                            {['facebook', 'twitter', 'instagram', 'linkedin'].map((social) => (
                                <a
                                    key={social}
                                    href={`#${social}`}
                                    className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:scale-110 hover:-translate-y-1 transition-all duration-300 group shadow-md"
                                    aria-label={`Siguenos en ${social}`}
                                >
                                    <span className="capitalize text-xs font-bold sr-only">{social}</span>
                                    {/* Icon placeholders - in real use, use icons from lucide or similar */}
                                    <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="lg:pl-10">
                        <h4 className="text-white font-bold text-lg mb-8 relative inline-block">
                            Plataforma
                            <span className="absolute bottom-[-10px] left-0 w-12 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"></span>
                        </h4>
                        <ul className="space-y-4">
                            {[
                                { name: 'Buscar Vehículos', href: '/search' },
                                { name: 'Concesionarios', href: '/dealers' },
                                { name: 'Vende tu Auto', href: '/vender' },
                                { name: 'Financiamiento', href: '/finance' },
                                { name: 'Publicidad', href: '/advertiser' }
                            ].map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-slate-400 hover:text-white hover:translate-x-2 flex items-center gap-2 transition-all duration-300 font-medium group"
                                    >
                                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full transition-transform scale-0 group-hover:scale-100"></span>
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources & Support */}
                    <div>
                        <h4 className="text-white font-bold text-lg mb-8 relative inline-block">
                            Ayuda y Recursos
                            <span className="absolute bottom-[-10px] left-0 w-12 h-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"></span>
                        </h4>
                        <ul className="space-y-4">
                            {[
                                { name: 'Centro de Ayuda', href: '/faq' },
                                { name: 'Sobre Nosotros', href: '/sobre-nosotros' },
                                { name: 'Términos de Servicio', href: '/terminos' },
                                { name: 'Privacidad', href: '/privacidad' },
                                { name: 'Contacto', href: '/contacto' }
                            ].map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="text-slate-400 hover:text-white hover:translate-x-2 flex items-center gap-2 transition-all duration-300 font-medium group"
                                    >
                                        <span className="w-1.5 h-1.5 bg-blue-600 rounded-full transition-transform scale-0 group-hover:scale-100"></span>
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50 backdrop-blur-xl relative group overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>

                        <h4 className="text-white font-extrabold text-xl mb-4 relative z-10 leading-tight">
                            Únete a nuestra Newletter
                        </h4>
                        <p className="text-slate-400 text-sm mb-6 relative z-10 font-medium leading-relaxed">
                            Recibe las mejores ofertas, lanzamientos y consejos para el cuidado de tu auto. Sin spam, solo contenido premium.
                        </p>

                        <form className="space-y-3 relative z-10" onSubmit={(e) => e.preventDefault()}>
                            <div className="relative group/input">
                                <input
                                    type="email"
                                    placeholder="tu@email.com"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-3 rounded-xl hover:from-blue-700 hover:to-indigo-800 transition-all shadow-xl hover:shadow-blue-900/40 hover:-translate-y-0.5 active:translate-y-0"
                            >
                                Suscribirme Gratuitamente
                            </button>
                        </form>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-slate-800 pt-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="text-slate-500 text-sm font-medium">
                        © {currentYear} AutoDealers Inc. Todos los derechos reservados.
                    </div>

                    <div className="flex items-center gap-8 text-slate-500 text-sm font-medium">
                        <Link href="/terminos" className="hover:text-white transition-colors">Términos</Link>
                        <Link href="/privacidad" className="hover:text-white transition-colors">Privacidad</Link>
                        <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            SSL Secure
                        </div>
                        <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            24/7 Support
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
