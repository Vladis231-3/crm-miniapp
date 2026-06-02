import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ZoomIn } from "lucide-react";

const photos = [
  {
    url: "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxOTY2OHww&ixlib=rb-4.1.0&q=80&w=1080",
    label: "Black Coupe — Full Detail",
    span: "col-span-2 row-span-2",
  },
  {
    url: "https://images.unsplash.com/photo-1608506375591-b90e1f955e4b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxOTY2OHww&ixlib=rb-4.1.0&q=80&w=400",
    label: "Foam Treatment",
    span: "",
  },
  {
    url: "https://images.unsplash.com/photo-1565689876697-e467b6c54da2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxOTY2OHww&ixlib=rb-4.1.0&q=80&w=400",
    label: "Wheel Detail",
    span: "",
  },
  {
    url: "https://images.unsplash.com/photo-1605437241278-c1806d14a4d9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYXIlMjBpbnRlcmlvciUyMGRldGFpbGluZyUyMGNsZWFufGVufDF8fHx8MTc4MDQxOTY3Mnww&ixlib=rb-4.1.0&q=80&w=400",
    label: "Interior — Leather Seats",
    span: "",
  },
  {
    url: "https://images.unsplash.com/photo-1533630217389-3a5e4dff5683?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxjYXIlMjBpbnRlcmlvciUyMGRldGFpbGluZyUyMGNsZWFufGVufDF8fHx8MTc4MDQxOTY3Mnww&ixlib=rb-4.1.0&q=80&w=400",
    label: "Steering Wheel Detail",
    span: "",
  },
  {
    url: "https://images.unsplash.com/photo-1575844611398-2a68400b437c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw3fHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxOTY2OHww&ixlib=rb-4.1.0&q=80&w=400",
    label: "White Mustang — Post Detail",
    span: "col-span-2",
  },
  {
    url: "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwzfHxjYXIlMjB3YXNoJTIwZGV0YWlsaW5nJTIwbHV4dXJ5fGVufDF8fHx8MTc4MDQxOTY2OHww&ixlib=rb-4.1.0&q=80&w=400",
    label: "Hand Wash Detail",
    span: "",
  },
];

export function GallerySection() {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <section id="gallery" className="py-20 md:py-28 bg-zinc-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="text-center mb-10 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sky-400 text-sm font-semibold tracking-widest uppercase mb-3">
            Our Work
          </p>
          <h2 className="text-white text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
            Gallery
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base px-2">
            Every car that leaves our studio looks like it just rolled off the
            showroom floor. Here's proof.
          </p>
        </motion.div>

        {/* Mobile: simple 2-col grid */}
        <div className="grid grid-cols-2 md:hidden gap-2">
          {photos.map((photo, i) => (
            <motion.div
              key={i}
              className="relative overflow-hidden rounded-xl cursor-pointer group aspect-square"
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              onClick={() => setLightbox(i)}
            >
              <img
                src={photo.url}
                alt={photo.label}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 active:bg-black/40 flex items-center justify-center">
                <ZoomIn className="w-7 h-7 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Desktop: masonry-style spanning grid */}
        <div className="hidden md:grid grid-cols-4 auto-rows-[200px] gap-3">
          {photos.map((photo, i) => (
            <motion.div
              key={i}
              className={`relative overflow-hidden rounded-xl cursor-pointer group ${photo.span}`}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              onClick={() => setLightbox(i)}
            >
              <img
                src={photo.url}
                alt={photo.label}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <p className="text-white text-sm font-medium">{photo.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <button
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/60 hover:text-white transition-colors z-10"
              onClick={() => setLightbox(null)}
            >
              <X className="w-8 h-8" />
            </button>
            <motion.img
              src={photos[lightbox].url}
              alt={photos[lightbox].label}
              className="max-w-full max-h-[85dvh] object-contain rounded-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-5 left-0 right-0 text-center text-white/60 text-sm px-4">
              {photos[lightbox].label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
