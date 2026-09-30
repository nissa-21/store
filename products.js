// Catálogo de productos NISSA
// Para agregar o cambiar imágenes de productos:
// 1. Agrega la imagen dentro de la carpeta "fotos/" (por ejemplo: "mi-producto.jpg")
// 2. En este archivo, indica el nombre de la imagen en la propiedad "image": "mi-producto.jpg" o en el array "images"
// El sistema resolverá automáticamente la ruta "./fotos/mi-producto.jpg" para que funcione
// perfectamente tanto en GitHub Pages como en desarrollo local.

const products = [
  {
    id: 1,
    name: "Pack Apple Original Certificado 20W",
    category: "celulares",
    tag: "Más Vendido",
    price: 100000,
    price3: 95000,
    price5: 90000,
    price20: 85000,
    image: "pack-apple-original-certificado-20w.jpg",
    images: [
      "pack-apple-original-certificado-20w.jpg",
      "pack-apple.jpg",
      "pack-apple-original-certificado-20w.png"
    ],
    description: "Combo completo de cargador de pared 20W Power Delivery + Cable USB-C a Lightning reforzado. Diseñado bajo estándares certificados para cuidar la salud de la batería de tu iPhone, proporcionando una recarga rápida y segura del 0% al 50% en solo 30 minutos.",
    features: [
      "Carga ultrarrápida Power Delivery de 20W reales para iPhone y iPad",
      "Protección inteligente contra sobrecalentamiento, picos de tensión y cortocircuitos",
      "Cable USB-C a Lightning de 1 metro con malla reforzada anti-quiebre",
      "Conserva y maximiza la vida útil y condición de la batería original de tu equipo",
      "Hasta 90 días de garantía oficial escrita en laboratorio NISSA con cambio directo"
    ],
    specs: {
      "Potencia de salida": "20W Power Delivery (USB-C)",
      "Conector incluido": "USB-C a Lightning (1 metro)",
      "Compatibilidad": "iPhone 8 hasta iPhone 14 Pro Max / iPad / AirPods",
      "Garantía": "90 días oficial escrita NISSA",
      "Disponibilidad": "Stock inmediato para entrega o retiro"
    }
  },
  {
    id: 2,
    name: "Cargador Rápido USB-C 25W Samsung Super Fast",
    category: "celulares",
    tag: "Super Fast Charge",
    price: 35000,
    price3: 32000,
    price5: 29500,
    price20: 27000,
    image: "cargador-rapido-usb-c-25w-samsung-super-fast.jpg",
    images: [
      "cargador-rapido-usb-c-25w-samsung-super-fast.jpg",
      "cargador-samsung.jpg"
    ],
    description: "Cargador de pared de 25W con protocolo Super Fast Charging (Power Delivery 3.0 PPS). Brinda recarga acelerada para smartphones Samsung Galaxy Series A, S, Z y Note, así como para dispositivos Android y consolas portátiles.",
    features: [
      "Tecnología Samsung Super Fast Charging 25W con control dinámico de voltaje PPS",
      "Carga del 0% al 60% en aproximadamente 35 minutos",
      "Cuerpo ignífugo con disipación térmica optimizada para uso continuo seguro",
      "Compatible con teléfonos Samsung, Xiaomi, Motorola, consolas Nintendo Switch y tablets",
      "Garantía de laboratorio NISSA por 90 días con soporte técnico especializado"
    ],
    specs: {
      "Potencia": "25W Super Fast Charging (PD 3.0 PPS)",
      "Puerto de salida": "USB Tipo-C hembra",
      "Compatibilidad": "Samsung Galaxy S20 a S24, Galaxy A54/A55/A34/A35, Z Fold/Flip y universales",
      "Garantía": "90 días oficial escrita NISSA",
      "Voltaje de entrada": "100-240V auto-regulable para viajes"
    }
  },
  {
    id: 3,
    name: "Cable USB-C a Lightning 1M Trenzado Reforzado",
    category: "accesorios",
    tag: "Ultra Resistente",
    price: 18000,
    price3: 16500,
    price5: 15000,
    price20: 13500,
    image: "cable-usb-c-a-lightning-1m-trenzado-reforzado.jpg",
    images: [
      "cable-usb-c-a-lightning-1m-trenzado-reforzado.jpg",
      "cable-iphone.jpg"
    ],
    description: "Cable de alta gama con revestimiento trenzado de nylon de grado militar y cabezales metálicos sellados. Diseñado para resistir más de 20.000 dobleces sin perder conductividad ni pelarse, admitiendo carga rápida de hasta 27W.",
    features: [
      "Estructura exterior en tejido de nylon trenzado antienredos y anti-tirones",
      "Soporta carga rápida Power Delivery de hasta 27W y sincronización de datos",
      "Puntas reforzadas de aleación de aluminio que previenen quiebres en los extremos",
      "Velocidad de transferencia de archivos y fotos a 480 Mbps sin cortes",
      "Garantía oficial NISSA de hasta 90 días ante cualquier falla de fábrica"
    ],
    specs: {
      "Conectores": "USB Tipo-C a Lightning",
      "Longitud": "1.0 metro",
      "Material exterior": "Nylon trenzado de alta densidad blindado",
      "Compatibilidad": "Toda la línea iPhone (8 al 14 Pro Max), iPad y accesorios",
      "Garantía": "90 días oficial escrita NISSA"
    }
  },
  {
    id: 4,
    name: "Mando DualSense PS5 Inalámbrico Original",
    category: "gaming",
    tag: "PlayStation Original",
    price: 95000,
    price3: 90000,
    price5: 86000,
    price20: 82000,
    image: "mando-dualsense-ps5-inalambrico-original.jpg",
    images: [
      "mando-dualsense-ps5-inalambrico-original.jpg",
      "mando-ps5.jpg"
    ],
    description: "El joystick oficial de PlayStation 5 que redefine la experiencia de juego. Cuenta con gatillos adaptativos dinámicos, retroalimentación háptica inmersiva de doble motor y micrófono integrado con botón mute directo.",
    features: [
      "Gatillos adaptativos con resistencia táctil progresiva según el juego",
      "Retroalimentación háptica de vanguardia para sentir el entorno en tus manos",
      "Micrófono incorporado y conector de 3.5mm para headsets gamer",
      "Batería recargable interna de larga autonomía con puerto USB-C de recarga rápida",
      "Compatible con PS5, PC Windows (Steam), Mac, iPhone, iPad y celulares Android"
    ],
    specs: {
      "Conectividad": "Bluetooth 5.1 inalámbrico de baja latencia y USB-C cableado",
      "Compatibilidad": "PlayStation 5, PC Windows, macOS, Android, iOS",
      "Batería": "Interna recargable de 1560 mAh Li-ion",
      "Audio": "Altavoz y micrófono integrados + jack 3.5mm estéreo",
      "Garantía": "90 días oficial escrita NISSA"
    }
  },
  {
    id: 5,
    name: "Auriculares Bluetooth In-Ear True Wireless HiFi",
    category: "audio",
    tag: "Sonido Hi-Fi TWS",
    price: 45000,
    price3: 42000,
    price5: 39000,
    price20: 36000,
    image: "auriculares-bluetooth-in-ear-true-wireless-hifi.jpg",
    images: [
      "auriculares-bluetooth-in-ear-true-wireless-hifi.jpg",
      "auriculares-bluetooth.jpg"
    ],
    description: "Auriculares inalámbricos True Wireless con diafragma de 13mm para una acústica nítida y graves profundos. Cuentan con estuche de carga magnético con conector USB-C y autonomía total de hasta 24 horas.",
    features: [
      "Bluetooth 5.3 con sincronización instantánea y latencia ultrabaja para gaming",
      "Cancelación de ruido pasiva ergonómica para aislar el sonido exterior",
      "Controles táctiles inteligentes para pausar, cambiar canciones y atender llamadas",
      "Micrófono HD de alta sensibilidad para llamadas claras y notas de voz",
      "Diseño ultraliviano y resistente a salpicaduras (IPX4), ideal para entrenar"
    ],
    specs: {
      "Conectividad": "Bluetooth 5.3 (hasta 10 metros de cobertura)",
      "Autonomía": "5 a 6 hs continuas por carga (+18 hs adicionales con el estuche)",
      "Carga": "Puerto USB-C rápido (carga completa en 60 minutos)",
      "Compatibilidad": "Android, iOS, Windows, Mac y cualquier dispositivo con Bluetooth",
      "Garantía": "90 días oficial escrita NISSA"
    }
  },
  {
    id: 6,
    name: "Vidrio Templado 9D Full Cover Antigolpe",
    category: "accesorios",
    tag: "Máxima Protección",
    price: 8000,
    price3: 7200,
    price5: 6500,
    price20: 5500,
    image: "vidrio-templado-9d-full-cover-antigolpe.jpg",
    images: [
      "vidrio-templado-9d-full-cover-antigolpe.jpg",
      "vidrio-templado.jpg"
    ],
    description: "Protector de pantalla 9D de cobertura completa con bordes biselados negros y pegamento estático en toda la superficie. Absorbe impactos directos y caídas protegiendo el módulo original de tu smartphone.",
    features: [
      "Dureza certificada 9H que resiste rayones de llaves, monedas e impactos severos",
      "Pegado Full Glue total que evita la pérdida de sensibilidad táctil y burbujas",
      "Bordes pulidos 9D que no se enganchan al colocar fundas o sacar del bolsillo",
      "Tratamiento oleofóbico superior que reduce notablemente manchas de dedos y grasa",
      "Instalación profesional bonificada sin cargo en nuestro local NISSA"
    ],
    specs: {
      "Dureza": "9H Tempered Glass de alta densidad",
      "Cobertura": "100% de la pantalla (Edge to Edge)",
      "Espesor": "0.33mm de alta transparencia HD",
      "Compatibilidad": "Disponible para modelos iPhone, Samsung y Motorola",
      "Garantía": "90 días oficial escrita NISSA"
    }
  },
  {
    id: 7,
    name: "Funda Case Magnética Silicona Suave MagSafe",
    category: "accesorios",
    tag: "MagSafe Integrado",
    price: 22000,
    price3: 20000,
    price5: 18500,
    price20: 16500,
    image: "funda-case-magnetica-silicona-suave-magsafe.jpg",
    images: [
      "funda-case-magnetica-silicona-suave-magsafe.jpg",
      "funda-magsafe.jpg"
    ],
    description: "Funda de silicona líquida premium con anillo magnético MagSafe de 38 imanes de neodimio integrados. Su interior de microfibra aterciopelada previene ralladuras en la tapa trasera del celular.",
    features: [
      "Alineación magnética fuerte para cargadores inalámbricos, soportes y billeteras MagSafe",
      "Interior forrado en suave terciopelo para máxima protección del cristal trasero",
      "Bordes biselados sobre la pantalla y la cámara para amortiguar caídas frontales",
      "Acabado Soft-Touch antideslizante, agradable al tacto y fácil de limpiar",
      "Botones independientes que brindan un clic táctil firme y preciso"
    ],
    specs: {
      "Material": "Silicona líquida exterior + microfibra interior aterciopelada",
      "Tecnología": "Anillo magnético MagSafe de alta adherencia",
      "Protección": "Absorción contra impactos en esquinas y bisel de cámara",
      "Compatibilidad": "Línea iPhone y modelos Samsung compatibles",
      "Garantía": "90 días oficial escrita NISSA"
    }
  },
  {
    id: 8,
    name: "Mando DualShock 4 PS4 Inalámbrico",
    category: "gaming",
    tag: "PlayStation 4",
    price: 68000,
    price3: 64000,
    price5: 60000,
    price20: 56000,
    image: "mando-dualshock-4-ps4-inalambrico.jpg",
    images: [
      "mando-dualshock-4-ps4-inalambrico.jpg",
      "mando-ps4.jpg"
    ],
    description: "El clásico joystick inalámbrico DualShock 4 para PlayStation 4 y PC. Equipado con panel multitáctil, sensor de movimiento SixAxis, barra luminosa reactiva y palancas analógicas de alta precisión.",
    features: [
      "Panel táctil frontal clicable de 2 puntos para interacción en juegos",
      "Doble motor de vibración interna que intensifica la acción en pantalla",
      "Barra luminosa con indicación visual de estado y jugador asignado",
      "Altavoz integrado y salida de audio estéreo 3.5mm para auriculares",
      "Compatible con PS4, PS4 Slim, PS4 Pro, computadoras Windows (Steam) y Smart TVs"
    ],
    specs: {
      "Conectividad": "Bluetooth 2.1 + EDR inalámbrico y Micro-USB",
      "Compatibilidad": "PlayStation 4 (todos los modelos), PC Windows, macOS, Android, iOS",
      "Batería": "Recargable de 1000 mAh integrada",
      "Conectores": "Jack 3.5mm estéreo + puerto de extensión y Micro-USB",
      "Garantía": "90 días oficial escrita NISSA"
    }
  }
];
