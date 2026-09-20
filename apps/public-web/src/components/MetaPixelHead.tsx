import { META_PIXEL_IDS } from '@/lib/meta-pixel';

/**
 * Código base oficial de Meta Pixel, en <head> (Administrador de eventos → Empezar).
 * Carga fbevents.js una vez, init de cada pixel, un solo PageView (llega a todos).
 * eventID permite deduplicar CAPI del pixel principal.
 */
const fbqInits = META_PIXEL_IDS.map((id) => `fbq('init', '${id}');`).join('\n');

export function MetaPixelHead() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
${fbqInits}
(function(){
  var id = 'pv_' + Date.now() + '_' + Math.random().toString(36).slice(2,10);
  window.__metaPixelEventId = id;
  fbq('track', 'PageView', {}, {eventID: id});
})();
          `.trim(),
        }}
      />
      <noscript>
        {META_PIXEL_IDS.map((id) => (
          <img
            key={id}
            height={1}
            width={1}
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${id}&ev=PageView&noscript=1`}
            alt=""
          />
        ))}
      </noscript>
    </>
  );
}
