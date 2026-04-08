import React from 'react';
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface StatsChartProps {
    type: 'line' | 'bar' | 'pie';
    data: any[];
    dataKeys: string[];
    colors?: string[];
    height?: number;
}

const StatsChart: React.FC<StatsChartProps> = ({
    type,
    data,
    dataKeys,
    colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
    height = 250
}) => {
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl shadow-2xl">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{label}</p>
                    {payload.map((p: any, i: number) => (
                        <p key={i} className="text-xs font-black text-white uppercase">
                            {p.name}: <span className="text-green-500">{p.value}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderChart = () => {
        switch (type) {
            case 'line':
                return (
                    <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#52525b"
                            fontSize={10}
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#52525b"
                            fontSize={10}
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            dx={-5}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {dataKeys.map((key, i) => (
                            <Line
                                key={key}
                                type="monotone"
                                dataKey={key}
                                stroke={colors[i % colors.length]}
                                strokeWidth={4}
                                dot={{ r: 4, fill: colors[i % colors.length], strokeWidth: 2 }}
                                activeDot={{ r: 6, strokeWidth: 0 }}
                            />
                        ))}
                    </LineChart>
                );
            case 'bar':
                return (
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis
                            dataKey="name"
                            stroke="#52525b"
                            fontSize={10}
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#52525b"
                            fontSize={10}
                            fontWeight="bold"
                            tickLine={false}
                            axisLine={false}
                            dx={-5}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        {dataKeys.map((key, i) => (
                            <Bar
                                key={key}
                                dataKey={key}
                                fill={colors[i % colors.length]}
                                radius={[6, 6, 0, 0]}
                                barSize={32}
                            />
                        ))}
                    </BarChart>
                );
            case 'pie':
                return (
                    <PieChart>
                        <Pie
                            data={data}
                            innerRadius="60%"
                            outerRadius="90%"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                );
            default:
                return null;
        }
    };

    return (
        <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
                {renderChart() as any}
            </ResponsiveContainer>
        </div>
    );
};

export default StatsChart;
