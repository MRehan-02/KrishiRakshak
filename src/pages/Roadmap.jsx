import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useT } from '../i18n/useT';
import Loader from '../components/Loader';

const CROPS_LIST = [
  'Tomato',
  'Wheat',
  'Rice',
  'Cotton',
  'Soybean',
  'Sugarcane',
  'Onion',
  'Potato',
  'Maize',
  'Grapes',
];

// Fallback templates matching 002_seed.sql
const FALLBACK_TEMPLATES = {
  Tomato: [
    {
      stage: 'Vegetative & Early Growth',
      week_start: 1,
      week_end: 4,
      tasks: [
        'Apply balanced NPK 19:19:19 to seedlings',
        'Inspect leaf undersides for aphid colonies and whiteflies',
        'Install yellow sticky traps across rows (10 traps per acre)',
        'Maintain light soil moisture with drip irrigation',
      ],
      diseases_to_watch: ['Early Blight', 'Leaf Curl Virus', 'Damping Off'],
    },
    {
      stage: 'Flowering & Fruit Setting',
      week_start: 5,
      week_end: 8,
      tasks: [
        'Foliar spray of 0.2% Boron to enhance flower retention',
        'Spray copper oxychloride (0.25%) or Mancozeb if humid rains forecasted',
        'Support heavy fruiting branches with bamboo stakes',
        'Monitor fruit borer pheromone traps',
      ],
      diseases_to_watch: ['Late Blight', 'Fruit Borer', 'Bacterial Wilt'],
    },
  ],
  Wheat: [
    {
      stage: 'Crown Root & Tillering',
      week_start: 1,
      week_end: 4,
      tasks: [
        'First irrigation at CRI stage (21 days after sowing)',
        'Broadleaf weed management with 2,4-D amine',
        'Inspect foliage for yellow-orange rust pustules',
      ],
      diseases_to_watch: ['Yellow Rust', 'Loose Smut', 'Termites'],
    },
    {
      stage: 'Heading & Grain Filling',
      week_start: 5,
      week_end: 8,
      tasks: [
        'Foliar spray of 2% potassium nitrate at boot stage',
        'Monitor for brown rust lesions on flag leaves',
        'Inspect ear heads for aphid colonies',
      ],
      diseases_to_watch: ['Brown Rust', 'Powdery Mildew', 'Aphids'],
    },
  ],
  Cotton: [
    {
      stage: 'Square Formation & Vegetative',
      week_start: 1,
      week_end: 6,
      tasks: [
        'Erect pheromone traps for pink bollworm monitoring',
        'Maintain clean weed-free bunds to deter sucking pests',
        'Apply neem oil 1500 ppm as preventative spray',
      ],
      diseases_to_watch: ['Pink Bollworm', 'Whitefly', 'Bacterial Blight'],
    },
  ],
};

export function Roadmap() {
  const { user, profile } = useAuth();
  const { t } = useT();

  const [selectedCrop, setSelectedCrop] = useState('Tomato');
  const [sowingDate, setSowingDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [activeCropId, setActiveCropId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  // 1. Check if user already has an active crop
  useEffect(() => {
    let mounted = true;

    async function checkExistingCrop() {
      if (!user?.id) return;
      try {
        setLoading(true);
        const { data: crops } = await supabase
          .from('crops')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (mounted && crops && crops.length > 0) {
          const current = crops[0];
          setActiveCropId(current.id);
          setSelectedCrop(current.crop_name);
          setSowingDate(current.sowing_date);
          await loadCropTasks(current.id, current.crop_name);
        } else {
          // Load default template for Tomato
          loadTemplateStages('Tomato');
        }
      } catch (err) {
        console.warn('Existing crop check notice:', err);
        loadTemplateStages('Tomato');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    checkExistingCrop();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Load template stages for selected crop
  async function loadTemplateStages(cropName) {
    try {
      const { data: tpls } = await supabase
        .from('crop_templates')
        .select('*')
        .ilike('crop_name', `%${cropName}%`);

      if (tpls && tpls.length > 0) {
        setTemplates(tpls);
      } else {
        setTemplates(FALLBACK_TEMPLATES[cropName] || FALLBACK_TEMPLATES.Tomato);
      }
    } catch {
      setTemplates(FALLBACK_TEMPLATES[cropName] || FALLBACK_TEMPLATES.Tomato);
    }
  }

  // Load existing tasks from roadmap_tasks
  async function loadCropTasks(cropId, cropName) {
    await loadTemplateStages(cropName);

    try {
      const { data: taskRows } = await supabase
        .from('roadmap_tasks')
        .select('*')
        .eq('crop_id', cropId)
        .order('week', { ascending: true });

      if (taskRows && taskRows.length > 0) {
        setTasks(taskRows);
      } else {
        // Generate tasks from templates
        await generateTasksFromTemplates(cropId, cropName);
      }
    } catch (err) {
      console.warn('Load tasks notice:', err);
    }
  }

  // Generate tasks from crop_templates into roadmap_tasks
  async function generateTasksFromTemplates(cropId, cropName) {
    const tpls = FALLBACK_TEMPLATES[cropName] || FALLBACK_TEMPLATES.Tomato;
    const generated = [];

    tpls.forEach((stage) => {
      const taskList = stage.tasks || [];
      taskList.forEach((taskDesc, idx) => {
        generated.push({
          crop_id: cropId,
          week: stage.week_start + idx,
          task: taskDesc,
          done: false,
        });
      });
    });

    try {
      if (user?.id) {
        const { data: inserted } = await supabase
          .from('roadmap_tasks')
          .insert(generated)
          .select();
        if (inserted) {
          setTasks(inserted);
          return;
        }
      }
    } catch (err) {
      console.warn('Insert tasks notice:', err);
    }

    setTasks(generated.map((g, i) => ({ ...g, id: `local-${i}` })));
  }

  // Create new Crop & Roadmap
  const handleCreateRoadmap = async (e) => {
    e.preventDefault();
    setLoading(true);
    setNotice('');

    try {
      let cropId = null;

      if (user?.id) {
        const { data: newCrop, error } = await supabase
          .from('crops')
          .insert({
            user_id: user.id,
            crop_name: selectedCrop,
            sowing_date: sowingDate,
            district: profile?.district || 'Pune',
          })
          .select()
          .single();

        if (!error && newCrop) {
          cropId = newCrop.id;
          setActiveCropId(cropId);
        }
      }

      if (!cropId) {
        cropId = 'crop-' + Date.now();
        setActiveCropId(cropId);
      }

      await generateTasksFromTemplates(cropId, selectedCrop);
      setNotice(`✓ Roadmap generated for ${selectedCrop}!`);
      setTimeout(() => setNotice(''), 4000);
    } catch (err) {
      console.warn('Roadmap creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle task done
  const handleToggleTask = async (taskId, currentDone) => {
    const updated = !currentDone;
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, done: updated } : t))
    );

    try {
      if (String(taskId).startsWith('local-')) return;
      await supabase
        .from('roadmap_tasks')
        .update({ done: updated })
        .eq('id', taskId);
    } catch (err) {
      console.warn('Task update warning:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B5E20]">
          {t('roadmap_title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-600">
          {t('roadmap_subtitle')}
        </p>
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-sm font-semibold shadow-sm text-center">
          {notice}
        </div>
      )}

      {/* Crop Selection Form Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D7E7D5] shadow-sm max-w-xl mx-auto space-y-4">
        <form onSubmit={handleCreateRoadmap} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('roadmap_select_crop')}
              </label>
              <select
                value={selectedCrop}
                onChange={(e) => {
                  setSelectedCrop(e.target.value);
                  loadTemplateStages(e.target.value);
                }}
                className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm"
              >
                {CROPS_LIST.map((crop) => (
                  <option key={crop} value={crop}>
                    {crop}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                {t('roadmap_sowing_date')}
              </label>
              <input
                type="date"
                required
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                className="block w-full min-h-[48px] px-3.5 rounded-xl border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#2E7D32] text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
          >
            <span>📅</span>
            <span>{t('roadmap_create_btn')}</span>
          </button>
        </form>
      </div>

      {/* Roadmap Checklist & Growth Stages */}
      {loading ? (
        <Loader message="Loading crop care plan..." />
      ) : (
        <div className="space-y-6">
          {/* Templates & Diseases to Watch Card */}
          {templates.length > 0 && (
            <div className="bg-gradient-to-br from-[#E8F5E9] to-[#F1F8F1] rounded-3xl p-6 sm:p-8 border border-[#D7E7D5] space-y-4">
              <h2 className="text-base font-bold text-[#1B5E20] flex items-center gap-2">
                <span>🛡️</span> {t('roadmap_diseases_watch')} ({selectedCrop})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((stg, idx) => {
                  const diseases = Array.isArray(stg.diseases_to_watch)
                    ? stg.diseases_to_watch
                    : [];
                  return (
                    <div
                      key={idx}
                      className="bg-white p-4 rounded-2xl border border-[#D7E7D5] shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">
                          {stg.stage}
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#1B5E20]">
                          Weeks {stg.week_start} - {stg.week_end}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {diseases.map((d, dIdx) => (
                          <span
                            key={dIdx}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-800 border border-red-200"
                          >
                            ⚠️ {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Weekly Tasks Checklist */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D7E7D5] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>✅</span> {t('roadmap_tasks_heading')}
              </h2>
              <span className="text-xs font-semibold px-3 py-1 bg-[#E8F5E9] text-[#1B5E20] rounded-full">
                {tasks.filter((t) => t.done).length} / {tasks.length} Completed
              </span>
            </div>

            {tasks.length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">
                {t('roadmap_no_crops')}
              </p>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id, task.done)}
                    className={`p-4 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${
                      task.done
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-[#D7E7D5] hover:bg-[#E8F5E9]/40 shadow-sm'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(task.done)}
                      onChange={() => {}} // Handled by container onClick
                      className="mt-1 w-5 h-5 text-[#2E7D32] rounded focus:ring-[#2E7D32]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#2E7D32]">
                          Week {task.week}
                        </span>
                        {task.done && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                            Done
                          </span>
                        )}
                      </div>
                      <p
                        className={`text-sm font-semibold mt-0.5 ${
                          task.done ? 'line-through text-slate-400' : 'text-slate-900'
                        }`}
                      >
                        {task.task}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Roadmap;
