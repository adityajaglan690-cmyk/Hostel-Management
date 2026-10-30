import React, { useState } from 'react';
import { Clock, Download, FileSpreadsheet } from 'lucide-react';

const hostels = [
  { name: 'Ramanujan Bhawan', type: 'Boys' },
  { name: 'Aryabhata Bhawan', type: 'Boys' },
  { name: 'Gargi Bhawan', type: 'Girls' },
  { name: 'Maitreyi Bhawan', type: 'Girls' }
];

const names = [
  'Aarav Sharma', 'Vivaan Singh', 'Aditya Joshi', 'Arjun Mehta', 'Rohan Verma',
  'Kabir Gupta', 'Ishaan Kapoor', 'Vihaan Malhotra', 'Ananya Patel', 'Aditi Agarwal',
  'Riya Nair', 'Saanvi Iyer', 'Meera Menon', 'Diya Reddy', 'Kavya Rao',
  'Neha Bansal', 'Priya Mishra', 'Pooja Das', 'Nandini Shah', 'Shreya Kulkarni',
  'Rahul Kumar', 'Karan Thakur', 'Yash Tiwari', 'Manav Sethi', 'Devansh Jain',
  'Siddharth Joshi', 'Harsh Vardhan', 'Mohit Rawat', 'Nikhil Yadav', 'Ankit Dubey',
  'Simran Kaur', 'Ishita Roy', 'Tanvi Chawla', 'Muskan Saini', 'Pallavi Joshi',
  'Sneha Rathi', 'Kriti Sharma', 'Ritika Sen', 'Ira Banerjee', 'Anushka Bose',
  'Vikram Negi', 'Abhishek Rawat', 'Saurabh Goyal', 'Deepak Rana', 'Aman Arora',
  'Naveen Bhatia', 'Gaurav Saxena', 'Varun Khanna', 'Rishabh Anand', 'Akash Pandey'
];

const initialReportData = hostels.map((hostel, hostelIndex) => {
  const rooms = Array.from({ length: 100 }, (_, index) => {
    const capacity = index % 3 === 0 ? 4 : 2;
    const occupied = index % 10 === 0 ? 0 : index % 7 === 0 ? 1 : capacity;
    return {
      room: `${Math.floor((101 + index) / 100)}-${String(101 + index).slice(-2)}`,
      category: index % 2 === 0 ? 'AC' : 'Non-AC',
      capacity,
      occupied,
      students: Array.from({ length: occupied }, (_, bedIndex) => names[(hostelIndex * 50 + index + bedIndex) % names.length])
    };
  });
  return {
    ...hostel,
    activeStudents: 50,
    rooms,
    occupiedRooms: rooms.filter((room) => room.occupied > 0).length,
    occupiedBeds: rooms.reduce((total, room) => total + room.occupied, 0),
    totalBeds: rooms.reduce((total, room) => total + room.capacity, 0)
  };
});

const timetableRows = [
  ['Breakfast', '7:30 AM - 9:00 AM', 'Paratha, curd, fruit and tea'],
  ['Lunch', '12:30 PM - 2:30 PM', 'Dal, rice, roti, seasonal vegetables'],
  ['Snacks', '5:00 PM - 6:00 PM', 'Tea, sprouts or evening snack'],
  ['Dinner', '7:30 PM - 9:30 PM', 'Roti, rice, dal and special dish']
];

export default function DeanHostelReport() {
  const [reportData, setReportData] = useState(initialReportData);
  const [filters, setFilters] = useState(() => hostels.reduce((result, hostel) => ({
    ...result,
    [hostel.name]: { category: 'ALL', capacity: 'ALL' }
  }), {}));

  const updateFilter = (hostelName, key, value) => {
    setFilters((current) => ({ ...current, [hostelName]: { ...current[hostelName], [key]: value } }));
  };

  const updateHostel = (hostelName, updater, studentDelta = 0) => {
    setReportData((current) => current.map((hostel) => {
      if (hostel.name !== hostelName) return hostel;
      const rooms = updater(hostel.rooms);
      return {
        ...hostel,
        rooms,
        activeStudents: Math.max(0, hostel.activeStudents + studentDelta),
        occupiedRooms: rooms.filter((room) => room.occupied > 0).length,
        occupiedBeds: rooms.reduce((total, room) => total + room.occupied, 0)
      };
    }));
  };

  const allocateBed = (hostelName, roomNumber) => {
    const student = window.prompt('Enter the student name to allocate this bed:');
    if (!student?.trim()) return;
    updateHostel(hostelName, (rooms) => rooms.map((room) => (
      room.room === roomNumber && room.occupied < room.capacity
        ? { ...room, occupied: room.occupied + 1, students: [...room.students, student.trim()] }
        : room
    )), 1);
  };

  const removeStudent = (hostelName, roomNumber, studentIndex, studentName) => {
    if (!window.confirm(`Remove ${studentName} from room ${roomNumber}?`)) return;
    updateHostel(hostelName, (rooms) => rooms.map((room) => (
      room.room === roomNumber
        ? { ...room, occupied: Math.max(0, room.occupied - 1), students: room.students.filter((_, index) => index !== studentIndex) }
        : room
    )), -1);
  };

  const downloadTimetable = () => {
    const escape = (value) => value.replace(/([\\()])/g, '\\$1');
    const lines = ['Hostel Mess Timetable', 'Weekly meal schedule for all boys and girls hostels', '', ['Meal', 'Time', 'Menu'].join('  |  '), ...timetableRows.map((row) => row.join('  |  '))];
    const stream = ['BT', '/F1 14 Tf', '50 760 Td', ...lines.flatMap((line, index) => [`(${escape(line)}) Tj`, index < lines.length - 1 ? '0 -28 Td' : '']), 'ET'].filter(Boolean).join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets[index + 1] = pdf.length;
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `).join('\n')}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dean-hostel-mess-timetable.pdf';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 flex items-start space-x-3">
        <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600"><FileSpreadsheet className="w-5 h-5" /></div>
        <div>
          <h3 className="font-bold text-slate-800 text-base">Hostel Audit Report</h3>
          <p className="text-xs text-slate-500 mt-1">Active residents, room occupancy, facilities, mess schedule and hostel entry instructions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportData.map((hostel) => (
          <div key={hostel.name} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{hostel.type} Hostel</p>
            <h4 className="font-bold text-slate-800 text-sm mt-1">{hostel.name}</h4>
            <p className="text-2xl font-bold text-brand-700 mt-3">{hostel.activeStudents}</p>
            <p className="text-[11px] text-slate-500">Active students</p>
            <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
              <div className="rounded-lg bg-slate-50 p-2"><span className="block font-bold text-slate-800">{hostel.occupiedRooms}/100</span><span className="text-slate-500">Rooms occupied</span></div>
              <div className="rounded-lg bg-slate-50 p-2"><span className="block font-bold text-slate-800">{hostel.occupiedBeds}/{hostel.totalBeds}</span><span className="text-slate-500">Beds occupied</span></div>
            </div>
          </div>
        ))}
      </div>

      {reportData.map((hostel) => {
        const filter = filters[hostel.name];
        const rooms = hostel.rooms.filter((room) => (
          (filter.category === 'ALL' || room.category === filter.category) &&
          (filter.capacity === 'ALL' || room.capacity === Number(filter.capacity))
        ));
        return (
          <div key={hostel.name} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div><h3 className="font-bold text-slate-800 text-base">{hostel.name} Room Details</h3><p className="text-xs text-slate-500 mt-0.5">100 rooms • {hostel.occupiedRooms} occupied • {100 - hostel.occupiedRooms} rooms with available beds</p></div>
              <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                {[['category', 'ALL', 'ALL'], ['category', 'AC', 'AC'], ['category', 'Non-AC', 'NON-AC'], ['capacity', '2', '2 BEDS'], ['capacity', '4', '4 BEDS']].map(([key, value, label]) => (
                  <button type="button" key={`${key}-${value}`} onClick={() => updateFilter(hostel.name, key, value)} className={`px-2.5 py-1 rounded-full ${filter[key] === value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{label}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs min-w-[720px]">
                <thead className="sticky top-0 bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200"><tr><th className="px-5 py-3">Room</th><th className="px-5 py-3">Facility</th><th className="px-5 py-3">Bed Type</th><th className="px-5 py-3">Occupancy</th><th className="px-5 py-3">Students</th></tr></thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {rooms.map((room) => (
                    <tr key={room.room}>
                      <td className="px-5 py-3 font-mono font-bold text-slate-800">{room.room}</td>
                      <td className="px-5 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${room.category === 'AC' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{room.category}</span></td>
                      <td className="px-5 py-3">{room.capacity} beds</td>
                      <td className="px-5 py-3 font-semibold"><span className={room.occupied === room.capacity ? 'text-emerald-700' : 'text-amber-700'}>{room.occupied}/{room.capacity} occupied</span></td>
                      <td className="px-5 py-3 text-slate-500">
                        {room.students.length > 0 ? <div className="flex flex-wrap gap-1.5">{room.students.map((student, studentIndex) => <span key={`${student}-${studentIndex}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1"><span>{student}</span><button type="button" onClick={() => removeStudent(hostel.name, room.room, studentIndex, student)} className="text-rose-600 hover:text-rose-800 font-bold" title="Remove from bed">×</button></span>)}</div> : 'No beds occupied'}
                        {room.occupied < room.capacity && <button type="button" onClick={() => allocateBed(hostel.name, room.room)} className="ml-3 px-2 py-1 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 text-[10px] font-bold">Allocate Bed</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-800 text-base">Hostel Mess Timetable</h3><p className="text-xs text-slate-500 mt-1">Weekly meal schedule for all four hostels</p></div><button type="button" onClick={downloadTimetable} className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold whitespace-nowrap"><Download className="w-3.5 h-3.5" /><span>Download PDF</span></button></div>
          <table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px]"><tr><th className="px-5 py-3">Meal</th><th className="px-5 py-3">Time</th><th className="px-5 py-3">Menu</th></tr></thead><tbody className="divide-y divide-slate-100 text-slate-700">{timetableRows.map((row) => <tr key={row[0]}><td className="px-5 py-3 font-semibold">{row[0]}</td><td className="px-5 py-3">{row[1]}</td><td className="px-5 py-3">{row[2]}</td></tr>)}</tbody></table>
        </div>
        <div className="bg-amber-50 rounded-3xl border border-amber-200 p-5 sm:p-6"><div className="flex items-start space-x-3"><div className="p-2.5 rounded-xl bg-amber-100 text-amber-700"><Clock className="w-5 h-5" /></div><div><h3 className="font-bold text-amber-900 text-base">Hostel Entry Notice</h3><p className="text-xs text-amber-800 mt-2 leading-5">All students must enter the hostel before <strong>8:00 PM</strong>. Any late entry must be reported to the Warden and recorded at the hostel gate.</p><p className="text-[11px] text-amber-700 mt-4 font-semibold">Applies to all boys and girls hostels.</p></div></div></div>
      </div>
    </div>
  );
}
