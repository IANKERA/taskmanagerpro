const COLORS = [
    "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500",
    "bg-purple-500", "bg-cyan-500", "bg-indigo-500", "bg-teal-500",
    "bg-orange-500", "bg-pink-500",
];

function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return Math.abs(h);
}

export default function Avatar({ username, size = "sm", className = "" }) {
    if (!username) return null;
    const initials = username.slice(0, 2).toUpperCase();
    const color = COLORS[hash(username) % COLORS.length];
    const sizeClass = size === "xs" ? "w-5 h-5 text-[9px]" :
                      size === "sm" ? "w-7 h-7 text-[10px]" :
                      size === "md" ? "w-9 h-9 text-xs" :
                      "w-12 h-12 text-sm";

    return (
        <span
            className={`inline-flex items-center justify-center rounded-full text-white font-semibold shrink-0 ${color} ${sizeClass} ${className}`}
            title={username}
        >
            {initials}
        </span>
    );
}
