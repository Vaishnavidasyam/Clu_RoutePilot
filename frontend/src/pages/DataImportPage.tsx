import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, FileText, CheckCircle2, AlertCircle, Download, ArrowRight } from 'lucide-react';
import { dataService } from '../services/api';
import { useOperationalDate } from '../context/DateTimeContext';
import { usePlan } from '../context/PlanContext';

export const DataImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { operationalDate, formattedDate } = useOperationalDate();
  const { refreshAll } = usePlan();
  const [execFile, setExecFile] = useState<File | null>(null);
  const [custFile, setCustFile] = useState<File | null>(null);
  const [execStatus, setExecStatus] = useState<string | null>(null);
  const [custStatus, setCustStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUploadExecutives = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setExecFile(file);
    setUploading(true);
    setError(null);
    try {
      const res = await dataService.importExecutivesCsv(file, operationalDate);
      if (res.success) {
        setExecStatus(`✓ ${file.name} — ${res.data?.count || 'Records'} parsed and verified for ${formattedDate}`);
        await refreshAll(operationalDate);
      } else {
        setError(res.error?.message || 'Executive CSV validation error');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Error uploading executives CSV');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadCustomers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setCustFile(file);
    setUploading(true);
    setError(null);
    try {
      const res = await dataService.importCustomersCsv(file, operationalDate);
      if (res.success) {
        setCustStatus(`✓ ${file.name} — ${res.data?.count || 'Records'} parsed and verified for ${formattedDate}`);
        await refreshAll(operationalDate);
      } else {
        setError(res.error?.message || 'Customer CSV validation error');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Error uploading customers CSV');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Data Pipeline</div>
          <h1 className="text-2xl font-bold text-navy">Import Daily CSV Files</h1>
          <p className="text-xs text-slate-500 mt-1">Upload executives and customer records for today&apos;s planning cycle</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/data/sample/executives.csv"
            download="sample_executives.csv"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample Executives</span>
          </a>
          <a
            href="/api/data/sample/customers.csv"
            download="sample_customers.csv"
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample Customers</span>
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        
        {/* Executives Uploader */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy">1. executives.csv</h3>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Required</span>
          </div>

          <label className="border-2 border-dashed border-slate-200 hover:border-orange rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-orange/5">
            <Upload className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-xs font-bold text-navy">Drop executives.csv here or browse</span>
            <span className="text-[11px] text-slate-400 mt-1">Columns: id, home_lat, home_lon, shift_start, shift_end, max_visits, max_km</span>
            <input type="file" accept=".csv" onChange={handleUploadExecutives} className="hidden" />
          </label>

          {execStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{execStatus}</span>
            </div>
          )}
        </div>

        {/* Customers Uploader */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy">2. customers.csv</h3>
            <span className="text-[11px] font-bold text-slate-400 uppercase">Required</span>
          </div>

          <label className="border-2 border-dashed border-slate-200 hover:border-orange rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/50 hover:bg-orange/5">
            <Upload className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-xs font-bold text-navy">Drop customers.csv here or browse</span>
            <span className="text-[11px] text-slate-400 mt-1">Columns: id, area, lat, lon, dpd, overdue_amount, priority_score, ptp_today, window_start, window_end, service_min</span>
            <input type="file" accept=".csv" onChange={handleUploadCustomers} className="hidden" />
          </label>

          {custStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{custStatus}</span>
            </div>
          )}
        </div>

      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <Link
          to="/data"
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
        >
          Cancel
        </Link>
        <Link
          to="/data/validation"
          className="px-6 py-2.5 rounded-xl text-xs font-bold bg-navy text-white hover:bg-navy-deep shadow transition flex items-center gap-2"
        >
          <span>Validate & Proceed</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

    </div>
  );
};
