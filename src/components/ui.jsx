"use client";

var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
import { Children, isValidElement, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
export function Button(_a) {
    var { variant = "primary", size = "md", className } = _a, p = __rest(_a, ["variant", "size", "className"]);
    return (<button {...p} className={cn("inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60", size === "sm" && "px-3 py-1.5 text-sm", size === "md" && "px-4 py-2.5 text-sm", size === "lg" && "px-6 py-3 text-base", variant === "primary" && "bg-fisa-800 text-white shadow hover:bg-fisa-700", variant === "secondary" && "bg-fisa-100 text-fisa-900 hover:bg-fisa-200", variant === "outline" && "border border-fisa-200 bg-white text-fisa-800 hover:border-fisa-400 hover:bg-fisa-50", variant === "danger" && "bg-red-600 text-white shadow hover:bg-red-500", variant === "ghost" && "text-fisa-700 hover:bg-fisa-100", className)}/>);
}
/* ---- Input / Select / Textarea ---- */
const field = "w-full rounded-xl border border-fisa-200 bg-white px-3.5 py-2.5 text-sm text-fisa-950 placeholder:text-fisa-500 outline-none transition focus:border-fisa-500 focus:ring-2 focus:ring-fisa-500/20";
export function Input(_a) {
    var { className } = _a, p = __rest(_a, ["className"]);
    return <input {...p} className={cn(field, className)}/>;
}
export function Select(_a) {
    var { className, children, value, onChange, disabled, required, name } = _a, p = __rest(_a, ["className", "children", "value", "onChange", "disabled", "required", "name"]);
    const [buka, setBuka] = useState(false);
    const [aktif, setAktif] = useState(0);
    const [posisi, setPosisi] = useState(null);
    const tombolRef = useRef(null);
    const daftarRef = useRef(null);
    const idDaftar = useId();

    const opsi = Children.toArray(children)
        .filter((c) => isValidElement(c) && c.type === "option")
        .map((c) => ({
            value: c.props.value,
            label: c.props.children,
            disabled: c.props.disabled,
        }));

    const terpilih = opsi.findIndex((o) => String(o.value) === String(value ?? ""));

    function bukaDaftar() {
        if (disabled) return;
        const rect = tombolRef.current?.getBoundingClientRect();
        if (rect) {
            const tinggiIdeal = Math.min(240, opsi.length * 40 + 8);
            const ruangBawah = window.innerHeight - rect.bottom - 8;
            const ruangAtas = rect.top - 8;
            const bukaKeAtas = ruangBawah < tinggiIdeal && ruangAtas > ruangBawah;
            const tinggi = Math.max(80, Math.min(tinggiIdeal, bukaKeAtas ? ruangAtas : ruangBawah));
            setPosisi({
                left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
                width: rect.width,
                top: bukaKeAtas ? rect.top - tinggi - 8 : rect.bottom + 8,
                maxHeight: tinggi,
            });
        }
        setAktif(terpilih >= 0 ? terpilih : 0);
        setBuka(true);
    }

    function tutup() {
        setBuka(false);
        setPosisi(null);
    }

    function pilih(o) {
        if (o.disabled) return;
        onChange?.({ target: { value: o.value, name } });
        tutup();
        tombolRef.current?.focus();
    }

    useEffect(() => {
        if (!buka) return;
        function diLuar(e) {
            if (!tombolRef.current?.contains(e.target) && !daftarRef.current?.contains(e.target))
                tutup();
        }
        function onKey(e) {
            if (e.key === "Escape") {
                e.preventDefault();
                tutup();
                tombolRef.current?.focus();
            }
        }
        function onScroll(e) {
            if (e.target instanceof Node && daftarRef.current?.contains(e.target)) return;
            tutup();
        }
        document.addEventListener("pointerdown", diLuar);
        document.addEventListener("keydown", onKey);
        window.addEventListener("scroll", onScroll, true);
        window.addEventListener("resize", onScroll);
        return () => {
            document.removeEventListener("pointerdown", diLuar);
            document.removeEventListener("keydown", onKey);
            window.removeEventListener("scroll", onScroll, true);
            window.removeEventListener("resize", onScroll);
        };
    }, [buka]);

    function onKeyDown(e) {
        if (disabled) return;
        if (!buka) {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                bukaDaftar();
            }
            return;
        }
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const arah = e.key === "ArrowDown" ? 1 : -1;
            setAktif((i) => {
                let n = i;
                for (let langkah = 0; langkah < opsi.length; langkah++) {
                    n = (n + arah + opsi.length) % opsi.length;
                    if (!opsi[n]?.disabled) break;
                }
                return n;
            });
        } else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (opsi[aktif]) pilih(opsi[aktif]);
        } else if (e.key === "Tab") {
            tutup();
        }
    }

    const labelTerpilih = terpilih >= 0 ? opsi[terpilih].label : null;

    return (<div className={cn("relative", className)}>
      <button
        {...p}
        ref={tombolRef}
        type="button"
        disabled={disabled}
        onClick={() => (buka ? tutup() : bukaDaftar())}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={buka}
        aria-controls={idDaftar}
        aria-activedescendant={buka ? `${idDaftar}-${aktif}` : undefined}
        aria-required={required || undefined}
        className={cn(field, "relative flex cursor-pointer items-center pr-12 text-left", disabled && "cursor-not-allowed opacity-60")}
      >
        <span className={cn("min-w-0 flex-1 truncate", terpilih < 0 && "text-fisa-950/40")}>{labelTerpilih ?? "Pilih…"}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-xl border-l border-fisa-100 bg-fisa-50/70 text-fisa-600">
          <ChevronDown size={16} strokeWidth={2.5} className={cn("transition", buka && "rotate-180")}/>
        </span>
      </button>
      {buka && posisi && createPortal(
        <ul
          ref={daftarRef}
          id={idDaftar}
          role="listbox"
          tabIndex={-1}
          style={{ position: "fixed", left: posisi.left, top: posisi.top, width: posisi.width, maxHeight: posisi.maxHeight }}
          className="z-[100] overflow-y-auto rounded-xl border border-fisa-100 bg-white p-1 shadow-xl ring-1 ring-fisa-900/5"
        >
          {opsi.map((o, i) => (
            <li
              key={`${o.value}-${i}`}
              id={`${idDaftar}-${i}`}
              role="option"
              aria-selected={i === terpilih}
              aria-disabled={o.disabled || undefined}
              onMouseEnter={() => setAktif(i)}
              onClick={() => pilih(o)}
              className={cn(
                "cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition",
                o.disabled && "cursor-not-allowed opacity-50",
                i === terpilih ? "bg-fisa-800 text-white" : i === aktif ? "bg-fisa-50 text-fisa-900" : "text-fisa-900",
              )}
            >
              {o.label}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>);
}
export function Textarea(_a) {
    var { className } = _a, p = __rest(_a, ["className"]);
    return <textarea {...p} className={cn(field, "min-h-20", className)}/>;
}
export function Label({ children, className }) {
    return <label className={cn("mb-1.5 block text-sm font-semibold text-fisa-900", className)}>{children}</label>;
}
/* ---- Kartu ---- */
export function Card({ className, children }) {
    return (<div className={cn("rounded-2xl border border-fisa-100 bg-white shadow-sm overflow-hidden", className)}>
      {children}
    </div>);
}
/* ---- Badge status ---- */
export function StatusBadge({ status, className }) {
    const map = {
        menunggu: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200", dot: "bg-amber-500" },
        disetujui: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
        ditolak: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-200", dot: "bg-red-500" },
        belum_bayar: { bg: "bg-slate-50", text: "text-slate-600", ring: "ring-slate-200", dot: "bg-slate-400" },
        sebagian: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200", dot: "bg-blue-500" },
        lunas: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
        dibatalkan: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-200", dot: "bg-red-400" },
    };
    const label = {
        menunggu: "Menunggu",
        disetujui: "Disetujui",
        ditolak: "Ditolak",
        belum_bayar: "Belum Bayar",
        sebagian: "Sebagian",
        lunas: "Lunas",
        dibatalkan: "Dibatalkan",
    };
    const style = map[status] ?? { bg: "bg-slate-50", text: "text-slate-600", ring: "ring-slate-200", dot: "bg-slate-400" };
    return (
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1", style.bg, style.text, style.ring, className)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
            {label[status] ?? (status?.charAt(0).toUpperCase() + status?.slice(1))}
        </span>
    );
}
/* ---- Modal sederhana ---- */
export function Modal({ open, onClose, title, children, wide }) {
    if (!open || typeof document === "undefined")
        return null;
    return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-fisa-950/60 backdrop-blur-sm" onClick={onClose}/>
      <div role="dialog" aria-modal="true" className={cn("relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-fisa-100 bg-white p-6 shadow-2xl", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-extrabold text-fisa-900">{title}</h3>
          <button onClick={onClose} aria-label="Tutup" className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full bg-fisa-50 text-xl leading-none text-fisa-700 transition hover:bg-fisa-100">×</button>
        </div>
        {children}
      </div>
    </div>, document.body);
}
/* ---- Toggle switch ---- */
export function Switch({ checked, onChange, label }) {
    return (<button type="button" onClick={() => onChange(!checked)} className="flex cursor-pointer items-center gap-2">
      <span className={cn("relative h-6 w-11 rounded-full transition", checked ? "bg-fisa-700" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")}/>
      </span>
      {label && <span className="text-sm font-medium text-fisa-900">{label}</span>}
    </button>);
}
/* ---- Skeleton loading ---- */
export function Skeleton({ className }) {
    return <div className={cn("animate-pulse rounded-xl bg-fisa-100", className)}/>;
}
