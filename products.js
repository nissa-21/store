// Catálogo de productos NISSA
// Para agregar o cambiar imágenes de productos:
// 1. Agrega la imagen dentro de la carpeta "fotos/" (por ejemplo: "mi-producto.jpg")
// 2. En este archivo, indica el nombre de la imagen en la propiedad "image": "mi-producto.jpg"
// El sistema resolverá automáticamente la ruta "./fotos/mi-producto.jpg" para que funcione
// perfectamente tanto en GitHub Pages como en desarrollo local.

const products = [
  {
    id: 1,
    name: "Pack Apple Original Certificado 20W",
    category: "celulares",
    price: 35000,
    price3: 32000,
    price5: 29000,
    price20: 24000,
    image: "pack-apple-original-certificado-20w.png"
  },
  {
    id: 2,
    name: "Cargador Rápido USB-C 25W Samsung Super Fast",
    category: "celulares",
    price: 35000,
    price3: 32000,
    price5: 29500,
    price20: 27000,
    image: "cargador-rapido-usb-c-25w-samsung-super-fast.jpg"
  },
  {
    id: 3,
    name: "Cable USB-C a Lightning 1M Trenzado Reforzado",
    category: "accesorios",
    price: 18000,
    price3: 16500,
    price5: 15000,
    price20: 13500,
    image: "cable-usb-c-a-lightning-1m-trenzado-reforzado.jpg"
  },
  {
    id: 4,
    name: "Mando DualSense PS5 Inalámbrico Original",
    category: "gaming",
    price: 95000,
    price3: 90000,
    price5: 86000,
    price20: 82000,
    image: "mando-dualsense-ps5-inalambrico-original.jpg"
  },
  {
    id: 5,
    name: "Auriculares Bluetooth In-Ear True Wireless HiFi",
    category: "audio",
    price: 45000,
    price3: 42000,
    price5: 39000,
    price20: 36000,
    image: "auriculares-bluetooth-in-ear-true-wireless-hifi.jpg"
  },
  {
    id: 6,
    name: "Vidrio Templado 9D Full Cover Antigolpe",
    category: "accesorios",
    price: 8000,
    price3: 7200,
    price5: 6500,
    price20: 5500,
    image: "vidrio-templado-9d-full-cover-antigolpe.jpg"
  },
  {
    id: 7,
    name: "Funda Case Magnética Silicona Suave MagSafe",
    category: "accesorios",
    price: 22000,
    price3: 20000,
    price5: 18500,
    price20: 16500,
    image: "funda-case-magnetica-silicona-suave-magsafe.jpg"
  },
  {
    id: 8,
    name: "Mando DualShock 4 PS4 Inalámbrico",
    category: "gaming",
    price: 68000,
    price3: 64000,
    price5: 60000,
    price20: 56000,
    image: "mando-dualshock-4-ps4-inalambrico.jpg"
  }
];
