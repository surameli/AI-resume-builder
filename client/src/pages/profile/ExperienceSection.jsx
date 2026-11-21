/**
 * ExperienceSection — lists work experiences with add/edit/delete.
 * Uses DrawerForm for add/edit, ConfirmDialog for delete.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase } from 'lucide-react';
import SectionCard   from '../../components/profile/SectionCard.jsx';
import ItemCard      from '../../components/profile/ItemCard.jsx';
import EmptyState    from '../../components/profile/EmptyState.jsx';
import DrawerForm    from '../../components/profile/DrawerForm.jsx';
import ConfirmDialog from '../../components/profile/ConfirmDialog.jsx';
import FormField     from '../../components/forms/FormField.jsx';
import Button        from '../../components/common/Button.jsx';
import Alert         from '../../components/common/Alert.jsx';
import * as profileService from '../../services/profile.service.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPLOYMENT_TYPES = [
  { value: 'FULL_TIME',   label: 'Full-time'   },
  { value: 'PART_TIME',   label: 'Part-time'   },
  { value: 'CONTRACT',    label: 'Contract'    },
  { value: 'FREELANCE',   label: 'Freelance'   },
  { value: 'INTERNSHIP',  label: 'Internship'  },
  { value: 'VOLUNTEER',   label: 'Volunteer'   },
  { value: 'OTHER',       label: 'Other'       },
];

/** Format a date string to "Jan 2022" for display */
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  company:          z.string().min(1, 'Company is required').max(150).trim(),
  jobTitle:         z.string().min(1, 'Job title is required').max(150).trim(),
  employmentType:   z.string().default('FULL_TIME'),
  location:         z.string().max(100).trim().optional().nullable(),
  startDate:        z.string().min(1, 'Start date is required'),
  endDate:          z.string().optional().nullable(),
  isCurrent:        z.boolean().default(false),
  responsibilities: z.string().max(5000).trim().optional().nullable(),
  achievements:     z.string().max(3000).trim().optional().nullable(),
});

// ─── Experience Form (inside drawer) ─────────────────────────────────────────

const ExperienceForm = ({ defaultValues, onSuccess, onClose }) => {
  const [serverError, setServerError] = useState('');
  const isEditing = !!defaultValues?.id;

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? { employmentType: 'FULL_TIME', isCurrent: false },
  });

  const isCurrent = watch('isCurrent');

  const onSubmit = async (data) => {
    setServerError('');
    // Convert empty strings to null for optional dates
    const payload = { ...data, endDate: data.isCurrent ? null : (data.endDate || null) };
    try {
      let res;
      if (isEditing) {
        res = await profileService.updateExperience(defaultValues.id, payload);
        onSuccess(res.data.data.experience, 'updated');
      } else {
        res = await profileService.createExperience(payload);
        onSuccess(res.data.data.experience, 'created');
      }
      onClose();
    } catch (err) {
      setServerError(err?.response?.data?.message ?? 'Failed to save. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <Alert type="error" message={serverError} dismissible />}

      <FormField label="Company" name="company" placeholder="Acme Corp" register={register} error={errors.company} required />
      <FormField label="Job title" name="jobTitle" placeholder="Software Engineer" register={register} error={errors.jobTitle} required />

      {/* Employment type */}
      <div className="space-y-1">
        <label className="form-label">Employment type</label>
        <select className="form-input" {...register('employmentType')}>
          {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <FormField label="Location" name="location" placeholder="San Francisco, CA (optional)" register={register} error={errors.location} />

      {/* Currently working checkbox */}
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input type="checkbox" className="w-4 h-4 rounded border-brand-border text-brand-orange focus:ring-brand-orange" {...register('isCurrent')} />
        <span className="text-sm text-brand-text">I currently work here</span>
      </label>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start date" name="startDate" type="date" register={register} error={errors.startDate} required />
        {!isCurrent && (
          <FormField label="End date" name="endDate" type="date" register={register} error={errors.endDate} />
        )}
      </div>

      {/* Responsibilities */}
      <div className="space-y-1">
        <label className="form-label">Responsibilities</label>
        <textarea rows={4} placeholder="Describe your main responsibilities…" className={`form-input resize-none ${errors.responsibilities ? 'form-input-error' : ''}`} {...register('responsibilities')} />
        <p className="form-hint">The AI will use this to tailor your resume bullet points.</p>
        {errors.responsibilities && <p className="form-error">{errors.responsibilities.message}</p>}
      </div>

      {/* Achievements */}
      <div className="space-y-1">
        <label className="form-label">Key achievements</label>
        <textarea rows={3} placeholder="e.g. Reduced deployment time by 40%, Led a team of 5 engineers…" className={`form-input resize-none ${errors.achievements ? 'form-input-error' : ''}`} {...register('achievements')} />
        <p className="form-hint">Only include achievements you can verify. Never invent numbers.</p>
        {errors.achievements && <p className="form-error">{errors.achievements.message}</p>}
      </div>

      <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-1">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        <Button type="submit" variant="primary" loading={isSubmitting} className="flex-1">
          {isEditing ? 'Update' : 'Add'} experience
        </Button>
      </div>
    </form>
  );
};

// ─── Main Section ─────────────────────────────────────────────────────────────

const ExperienceSection = ({ experiences: initialList, onListChange }) => {
  const [list,     setList]     = useState(initialList ?? []);
  const [drawer,   setDrawer]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openAdd  = ()  => { setEditing(null); setDrawer(true); };
  const openEdit = (item) => { setEditing(item); setDrawer(true); };
  const closeDrawer = () => { setDrawer(false); setEditing(null); };

  const handleSaved = (item, action) => {
    const next = action === 'created'
      ? [...list, item]
      : list.map(e => e.id === item.id ? item : e);
    setList(next);
    onListChange?.(next);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await profileService.deleteExperience(deleting.id);
      const next = list.filter(e => e.id !== deleting.id);
      setList(next);
      onListChange?.(next);
    } catch { /* error handled silently — could add toast */ }
    finally { setDeleteLoading(false); setDeleting(null); }
  };

  return (
    <>
      <SectionCard
        title="Work Experience"
        icon={Briefcase}
        count={list.length}
        onAdd={openAdd}
        addLabel="Add experience"
        isEmpty={list.length === 0}
        emptyState={
          <EmptyState
            icon={Briefcase}
            message="No work experience added yet. Add your first position to get started."
            action={<button onClick={openAdd} className="btn-primary btn-sm">Add experience</button>}
          />
        }
      >
        <div className="space-y-2">
          {list.map((exp) => (
            <ItemCard key={exp.id} onEdit={() => openEdit(exp)} onDelete={() => setDeleting(exp)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-brand-text truncate">{exp.jobTitle}</p>
                  <p className="text-sm text-brand-muted">{exp.company}</p>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {fmtDate(exp.startDate)} — {exp.isCurrent ? 'Present' : fmtDate(exp.endDate)}
                    {exp.location && <span className="ml-2">· {exp.location}</span>}
                  </p>
                </div>
                <span className="badge badge-blue shrink-0 text-xs capitalize">
                  {exp.employmentType.replace('_', ' ').toLowerCase()}
                </span>
              </div>
              {exp.responsibilities && (
                <p className="text-xs text-brand-muted mt-2 line-clamp-2">{exp.responsibilities}</p>
              )}
            </ItemCard>
          ))}
        </div>
      </SectionCard>

      <DrawerForm open={drawer} title={editing ? 'Edit Experience' : 'Add Experience'} onClose={closeDrawer}>
        {drawer && (
          <ExperienceForm
            defaultValues={editing ? {
              ...editing,
              startDate: editing.startDate ? new Date(editing.startDate).toISOString().split('T')[0] : '',
              endDate:   editing.endDate   ? new Date(editing.endDate).toISOString().split('T')[0]   : '',
            } : null}
            onSuccess={handleSaved}
            onClose={closeDrawer}
          />
        )}
      </DrawerForm>

      <ConfirmDialog
        open={!!deleting}
        title="Delete experience?"
        message={deleting ? `Remove "${deleting.jobTitle} at ${deleting.company}"? This cannot be undone.` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </>
  );
};

export default ExperienceSection;
