// Mini line chart SVG, responsive à la largeur passée en prop.
import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { COLORS } from './styles';

// data : [{ x: any, y: number, label?: string }]
// xFormat: fn(x) => string (axe X court)
// targetY : ligne horizontale optionnelle (poids cible par ex.)
// minPoints : si moins, on affiche un message vide à la place
export function LineChart({
  data,
  height = 160,
  width,
  color = COLORS.ink,
  fillUnderColor = null,
  targetY = null,
  yLabel = '',
  xFormat = (x) => String(x),
  minPoints = 2,
  emptyLabel = 'Pas encore assez de données',
}) {
  const screenW = width || (Dimensions.get('window').width - 56);
  if (!data || data.length < minPoints) {
    return (
      <View style={{ height, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.soft, borderRadius: 10 }}>
        <Text style={{ color: COLORS.muted, fontSize: 13 }}>{emptyLabel}</Text>
      </View>
    );
  }
  const padL = 36;
  const padR = 12;
  const padT = 10;
  const padB = 26;
  const chartW = screenW - padL - padR;
  const chartH = height - padT - padB;

  const ys = data.map(d => d.y);
  const ysWithTarget = targetY != null ? [...ys, targetY] : ys;
  const minY = Math.min(...ysWithTarget);
  const maxY = Math.max(...ysWithTarget);
  const spanY = maxY - minY || 1;
  const yPad = spanY * 0.1;
  const y0 = minY - yPad;
  const y1 = maxY + yPad;

  const xFor = (i) => padL + (i / (data.length - 1)) * chartW;
  const yFor = (val) => padT + chartH - ((val - y0) / (y1 - y0)) * chartH;

  const pathD = data.map((d, i) => {
    const x = xFor(i);
    const y = yFor(d.y);
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  const fillD = fillUnderColor
    ? pathD + ` L${xFor(data.length - 1).toFixed(1)},${padT + chartH} L${padL},${padT + chartH} Z`
    : null;

  // Y axis ticks: min, mid, max
  const yTicks = [y1, (y0 + y1) / 2, y0];

  return (
    <View>
      <Svg width={screenW} height={height}>
        {/* Y grid */}
        {yTicks.map((t, i) => {
          const y = yFor(t);
          return (
            <React.Fragment key={i}>
              <Line x1={padL} y1={y} x2={padL + chartW} y2={y} stroke={COLORS.line} strokeWidth="1" />
              <SvgText x={padL - 4} y={y + 3} textAnchor="end" fontSize="10" fill={COLORS.muted}>
                {t.toFixed(t < 10 ? 1 : 0)}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Target line */}
        {targetY != null && (
          <>
            <Line
              x1={padL} y1={yFor(targetY)}
              x2={padL + chartW} y2={yFor(targetY)}
              stroke="#1a7a3a" strokeWidth="1" strokeDasharray="4 3"
            />
            <SvgText x={padL + chartW - 2} y={yFor(targetY) - 3} textAnchor="end" fontSize="9" fill="#1a7a3a">
              cible {targetY}
            </SvgText>
          </>
        )}

        {/* Fill */}
        {fillD && <Path d={fillD} fill={fillUnderColor} />}

        {/* Line */}
        <Path d={pathD} stroke={color} strokeWidth="2" fill="none" />

        {/* Points */}
        {data.map((d, i) => (
          <Circle key={i} cx={xFor(i)} cy={yFor(d.y)} r="3" fill={color} />
        ))}

        {/* X axis labels (first, middle, last) */}
        {[0, Math.floor((data.length - 1) / 2), data.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <SvgText
            key={i}
            x={xFor(i)} y={height - 6}
            textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
            fontSize="10" fill={COLORS.muted}
          >
            {xFormat(data[i].x)}
          </SvgText>
        ))}
      </Svg>
      {yLabel ? (
        <Text style={{ position: 'absolute', top: 0, left: 0, fontSize: 10, color: COLORS.muted }}>{yLabel}</Text>
      ) : null}
    </View>
  );
}
