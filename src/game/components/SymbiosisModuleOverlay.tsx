import type { CrewMember } from "@/game/types";

export function hasMergedXenosymbiont(
    crew: CrewMember[],
    moduleId: number,
): boolean {
    return crew.some(
        (member) =>
            member.race === "xenosymbiont" &&
            member.isMerged &&
            member.mergedModuleId === moduleId,
    );
}

export function SymbiosisModuleOverlay({
    x,
    y,
    w,
    h,
}: {
    x: number;
    y: number;
    w: number;
    h: number;
}) {
    const inset = 5;
    const left = x + inset;
    const top = y + inset;
    const right = x + w - inset;
    const bottom = y + h - inset;
    const centerX = x + w / 2;
    const centerY = y + h / 2;

    return (
        <g className="pointer-events-none select-none">
            <title>Ксеноморф сросся с модулем</title>
            <rect
                x={x + 3}
                y={y + 3}
                width={w - 6}
                height={h - 6}
                fill="rgba(153,51,255,0.1)"
            />
            <rect
                x={x + 4}
                y={y + 4}
                width={w - 8}
                height={h - 8}
                fill="none"
                stroke="#c044ff"
                strokeWidth={3}
                strokeDasharray="8 5"
                opacity={0.95}
            />
            <rect
                x={x + 8}
                y={y + 8}
                width={w - 16}
                height={h - 16}
                fill="none"
                stroke="#ff66ff"
                strokeWidth={1.5}
                opacity={0.85}
            />
            <path
                d={`M ${left} ${top + h * 0.28} C ${x + w * 0.25} ${top} ${x + w * 0.38} ${centerY} ${centerX} ${centerY} S ${x + w * 0.77} ${bottom} ${right} ${bottom - h * 0.25}`}
                fill="none"
                stroke="#b000ff"
                strokeWidth={2}
                opacity={0.75}
            />
            <path
                d={`M ${left + w * 0.08} ${bottom} C ${x + w * 0.22} ${centerY} ${x + w * 0.36} ${centerY} ${centerX} ${top + h * 0.22} S ${x + w * 0.72} ${centerY} ${right} ${top + h * 0.18}`}
                fill="none"
                stroke="#ff4dff"
                strokeWidth={1.4}
                opacity={0.7}
            />
            <circle cx={centerX} cy={centerY} r={3.2} fill="#ff66ff" />
        </g>
    );
}

export function drawSymbiosisModuleOverlay(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
) {
    const inset = 5;
    const left = x + inset;
    const top = y + inset;
    const right = x + w - inset;
    const bottom = y + h - inset;
    const centerX = x + w / 2;
    const centerY = y + h / 2;

    ctx.save();
    ctx.fillStyle = "rgba(153,51,255,0.12)";
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

    ctx.strokeStyle = "#c044ff";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 5]);
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

    ctx.setLineDash([]);
    ctx.strokeStyle = "#ff66ff";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);

    ctx.strokeStyle = "#b000ff";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(left, top + h * 0.28);
    ctx.bezierCurveTo(
        x + w * 0.25,
        top,
        x + w * 0.38,
        centerY,
        centerX,
        centerY,
    );
    ctx.bezierCurveTo(
        x + w * 0.62,
        centerY,
        x + w * 0.77,
        bottom,
        right,
        bottom - h * 0.25,
    );
    ctx.stroke();

    ctx.strokeStyle = "#ff4dff";
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(left + w * 0.08, bottom);
    ctx.bezierCurveTo(
        x + w * 0.22,
        centerY,
        x + w * 0.36,
        centerY,
        centerX,
        top + h * 0.22,
    );
    ctx.bezierCurveTo(
        x + w * 0.62,
        top + h * 0.22,
        x + w * 0.72,
        centerY,
        right,
        top + h * 0.18,
    );
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ff66ff";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
