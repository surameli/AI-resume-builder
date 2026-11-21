/**
 * SkillsSection — displays skills as badges grouped by category.
 * Inline add form (no drawer needed — skills are simple one-liners).
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Zap, Plus, X } from 'lucide-react';
import SectionCard   from '../../components/profile/SectionCard.jsx';
import EmptyState    from '../../components/profile/EmptyState.jsx';
import ConfirmDialog from '../../components/profile/ConfirmDialog.jsx';
import Button        from '../../components/common/Button.jsx';
import Alert         from '../../components/common/Alert.jsx';
import * as profileService from '../../services/profile.service.js';

const CATEGORIES = [
  { value: 'TECHNICAL',           label: 'Technical'           },
  { value: 'PROGRAMMING_LANGUAGE',label: 'Programming Language' },
  { value: 'FRAMEWORK',           label: 'Framework / Library' },
  { value: 'DATABASE',            label: 'Database'            },
  { value: 'TOOL',                label: 'Tool'                },
  { value: 'SOFT_SKILL',          label: 'Soft Skill'          },
  { value: 'OTHER',               label: 'Other'               },
];

const categoryColors = {
  TECHNICAL:            'badge-blue',
  PROGRAMMING_LANGUAGE: 'badge-orange',
  FRAMEWORK:            'badge-green',
  DATABASE:             'badge-yellow',
  TOOL:                 'badge-gray',
  SOFT_SKILL:           'badge-blue',
  OTHER:                'badge-gray',
};

const schema = z.object({
  name:             z.string().min(1, 'Skill name is required').max(100).trim(),
  category:         z.string().default('TECHNICAL'),
  proficiencyLevel: z.coerce.number().int().min(1).max(5).optional().nullable(),
});

const SkillsSection = ({ skills: initialList, onListChange }) => {
  const [list,         setList]         = useState(initialList ?? []);
  const [showForm,     setShowForm]     = useState(false);
  const [deleting,     setDeleting]     = useState(null);
  const [deleteLoading,setDeleteLoading]= useState(false);
  const [serverError,  setServerError]  = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { category: 'TECHNICAL' },
  });

  const onSubmit = async (data) => {
    setServerError('');
    try {
      const res = await profileService.createSkill(data);
      const next = [...list, res.data.data.skill];
      setList(next); onListChange?.(next);
      reset({ category: 'TECHNICAL' });
      setShowForm(false);
    } catch (err) {
      setServerError(err?.response?.data?.message ?? 'Failed to add skill.');
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await profileService.deleteSkill(deleting.id);
      const next = list.filter(s => s.id !== deleting.id);
      setList(next); onListChange?.(next);
    } finally { setDeleteLoading(false); setDeleting(null); }
  };

  // Group skills by category for display
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = list.filter(s => s.category === cat.value);
    if (items.length) acc.push({ ...cat, items });
    return acc;
  }, []);

  return (
    <>
      <SectionCard
        title="Skills"
        icon={Zap}
        count={list.length}
        onAdd={() => setShowForm(v => !v)}
        addLabel="Add skill"
        isEmpty={list.length === 0 && !showForm}
        emptyState={
          <EmptyState
            icon={Zap}
            message="No skills added yet. Add at least 3 to improve your profile score."
            action={<button onClick={() => setShowForm(true)} className="btn-primary btn-sm">Add skill</button>}
          />
        }
      >
        {/* Inline add form */}
        {showForm && (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mb-4 p-4 bg-brand-bg rounded-xl border border-brand-border space-y-3">
            {serverError && <Alert type="error" message={serverError} dismissible />}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <input className={`form-input ${errors.name ? 'form-input-error' : ''}`} placeholder="Skill name *" {...register('name')} />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
              </div>
              <div>
                <select className="form-input" {...register('category')}>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <select className="form-input" {...register('proficiencyLevel')}>
                  <option value="">Proficiency (optional)</option>
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {['Beginner','Basic','Intermediate','Advanced','Expert'][n-1]}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => { setShowForm(false); reset(); }} className="btn-secondary btn-sm">Cancel</button>
              <Button type="submit" variant="primary" size="sm" loading={isSubmitting}>Add</Button>
            </div>
          </form>
        )}

        {/* Skill badges grouped by category */}
        {grouped.length > 0 && (
          <div className="space-y-4">
            {grouped.map(({ value, label, items }) => (
              <div key={value}>
                <p className="text-xs font-semibold text-brand-muted uppercase tracking-wide mb-2">{label}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map(skill => (
                    <span
                      key={skill.id}
                      className={`${categoryColors[skill.category] ?? 'badge-gray'} badge flex items-center gap-1.5 pr-1.5`}
                    >
                      {skill.name}
                      {skill.proficiencyLevel && (
                        <span className="opacity-60 text-[10px]">· {skill.proficiencyLevel}/5</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setDeleting(skill)}
                        className="hover:opacity-70 transition-opacity ml-0.5"
                        aria-label={`Remove ${skill.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!deleting}
        title="Remove skill?"
        message={deleting ? `Remove "${deleting.name}" from your profile?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </>
  );
};

export default SkillsSection;
