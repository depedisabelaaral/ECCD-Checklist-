
import React, { useState } from 'react';
import { MOCK_SCHOOLS } from '../constants';
import { Building2, Landmark, GraduationCap, Map as MapIcon } from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip as RechartsTooltip 
} from 'recharts';

const AdminView: React.FC = () => {
  const [selectedLegislative, setSelectedLegislative] = useState('All');
  const [selectedDistrict, setSelectedDistrict] = useState('All');

  const districts = ['All', 'District I', 'District II', 'District III'];
  const legDistricts = ['All', '1st District', '2nd District'];

  const completionData = [
    { name: 'Completed', value: 85, fill: '#10b981' },
    { name: 'In Progress', value: 10, fill: '#3b82f6' },
    { name: 'Pending', value: 5, fill: '#f59e0b' },
  ];

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-6 items-center">
        <div className="flex items-center gap-3">
          <Landmark className="w-5 h-5 text-gray-400" />
          <select 
            value={selectedLegislative}
            onChange={(e) => setSelectedLegislative(e.target.value)}
            className="px-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {legDistricts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <MapIcon className="w-5 h-5 text-gray-400" />
          <select 
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-4 py-2 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Schools in Selection
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MOCK_SCHOOLS.map((school) => (
              <div key={school.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <GraduationCap className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Active</span>
                </div>
                <h4 className="font-bold text-gray-900 mb-1">{school.name}</h4>
                <p className="text-sm text-gray-500">{school.district} • {school.legislativeDistrict}</p>
                <div className="mt-4 flex gap-4 border-t border-gray-100 pt-4">
                  <div>
                    <p className="text-xs text-gray-400">Learners</p>
                    <p className="font-bold">412</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Avg. Score</p>
                    <p className="font-bold">82%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold mb-6">Assessment Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={completionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {completionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Total Assessments Due</span>
              <span className="font-bold">1,500</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Target Completion Date</span>
              <span className="font-bold">Nov 15, 2024</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminView;
