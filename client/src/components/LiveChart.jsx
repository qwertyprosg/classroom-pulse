import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#1a1a28] border border-white/10 rounded-xl px-3 py-2.5 text-xs shadow-xl">
      <p className="text-white/40 mb-1.5 font-medium">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/70">{p.name}:</span>
          <span className="font-bold" style={{ color: p.color }}>{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export default function LiveChart({ data }) {
  if (!data.length) return (
    <div className="flex flex-col items-center justify-center h-full text-white/30 gap-2">
      <div className="text-3xl">📊</div>
      <p className="text-sm">Waiting for student responses...</p>
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
        <XAxis dataKey="time" tick={{ fill: '#5a5a6a', fontSize: 10, fontFamily: 'Inter' }} tickLine={false} axisLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: '#5a5a6a', fontSize: 10, fontFamily: 'Inter' }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle" iconSize={8}
          formatter={v => <span style={{ color: '#8a8a9a', fontSize: 12, fontFamily: 'Inter', fontWeight: 600 }}>{v}</span>}
        />
        <Line type="monotone" dataKey="following" name="Following" stroke="#22c55e" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#22c55e' }} />
        <Line type="monotone" dataKey="lost" name="Lost" stroke="#ef4444" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#ef4444' }} />
        <Line type="monotone" dataKey="ahead" name="Ahead" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#f59e0b' }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
