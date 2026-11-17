// Catálogo oficial de productos NISSA
// Generado automáticamente desde el Panel de Administración NISSA
// Actualizado: 17/11/2026, 10:33:08
// 100% Compatible con GitHub Pages (Costo $0)

let products = [
  {
    "id": 1,
    "name": "Combo Cargador iPhone Apple 20W Original Certificado",
    "category": "celulares",
    "tag": "Más Vendido",
    "price": 35000,
    "price3": 31000,
    "price5": 28000,
    "price20": 24000,
    "image": "pack-apple-original-certificado-20w.jpg",
    "images": [
      "pack-apple-original-certificado-20w.jpg",
      "pack-apple-caja.jpg",
      "pack-apple-cable-detalle.jpg"
    ],
    "description": "Combo completo de cargador de pared 20W Power Delivery + Cable USB-C a Lightning reforzado. Diseñado bajo estándares certificados para cuidar la salud de la batería de tu iPhone, proporcionando una recarga rápida y segura del 0% al 50% en solo 30 minutos.",
    "features": [
      "Carga ultrarrápida Power Delivery de 20W reales para iPhone y iPad",
      "Protección inteligente contra sobrecalentamiento, picos de tensión y cortocircuitos",
      "Cable USB-C a Lightning de 1 metro con malla reforzada anti-quiebre",
      "Conserva y maximiza la vida útil y condición de la batería original de tu equipo",
      "Hasta 90 días de garantía oficial escrita en laboratorio NISSA con cambio directo"
    ],
    "specs": {
      "Potencia de salida": "20W Power Delivery (USB-C)",
      "Conector incluido": "USB-C a Lightning (1 metro)",
      "Compatibilidad": "iPhone 8 hasta iPhone 14 Pro Max / iPad / AirPods",
      "Garantía": "90 días oficial escrita NISSA",
      "Disponibilidad": "Stock inmediato para entrega o retiro"
    }
  }
];

// Exponer en window para compatibilidad global
if (typeof window !== "undefined") {
  window.products = products;
}
