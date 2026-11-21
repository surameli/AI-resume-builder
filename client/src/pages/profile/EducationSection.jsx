/**
 * EducationSection — lists education records with add/edit/delete.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap } from 'lucide-react';
import SectionCard   from '../../components/profile/SectionCard.jsx';
import ItemCard      from '../../components/profile/ItemCard.jsx';
import EmptyState    from '../../components/profile/EmptyState.jsx';
import DrawerForm    from '../../components/profile/DrawerForm.jsx';
import ConfirmDialog from '../../components/profile/ConfirmDialog.jsx';
import FormField     from '../../components/forms/FormField.jsx';
import Button        from '../../components/common/Button.jsx';
import Alert         from '../../components/common/Alert.jsx';
import * as profileService from '../../services/profile.service.js';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';

const schema = z.object({
  institution:    z.string().min(1, 'Institution is required').max(200).trim(),
  degree:         z.string().min(1, 'Degree is required').max(150).trim(),
  fieldOfStudy:   z.string().max(150).trim().optional().nullable(),
  startDate:      z.string().min(1, 'Start date is required'),
  graduationDate: z.string().optional().nullable(),
  gpa:            z.string().max(10).trim().optional().nullable(),
  description:    z.string().max(2000).trim().optional().nullable(),
});

const EducationForm = ({ defaultValues, onSuccess, onClose }) => {
  const [serverError, setServerError] = useState('');
  const isEditing = !!defaultValues?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  const onSubmit = async (data) => {
    setServerError('');
    const payload = { ...data, graduationDate: data.graduationDate || null };
    try {
      let res;
      if (isEditing) {
        res = await profileService.updateEducation(defaultValues.id, payload);
        onSuccess(res.data.data.education, 'updated');
      } else {
        res = await profileService.createEducation(payload);
        onSuccess(res.data.data.education, 'created');
      }
      onClose();
    } catch (err) {
      setServerError(err?.response?.data?.message ?? 'Failed to save.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <Alert type="error" message={serverError} dismissible />}
      <FormField label="Institution" name="institution" placeholder="State University" register={register} error={errors.institution} required />
      <FormField label="Degree" name="degree" placeholder="Bachelor of Science" register={register} error={errors.degree} required />
      <FormField label="Field of study" name="fieldOfStudy" placeholder="Computer Science" register={register} error={errors.fieldOfStudy} />
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start date"       name="startDate"      type="date" register={register} error={errors.startDate}      required />
        <FormField label="Graduation date"  name="graduationDate" type="date" register={register} error={errors.graduationDate} />
      </div>
      <FormField label="GPA (optional)" name="gpa" placeholder="e.g. 3.8 / 4.0" register={register} error={errors.gpa} />
      <div className="space-y-1">
        <label className="form-label">Description / Activities</label>
        <textarea rows={3} placeholder="Relevant coursework, honours, clubs…" className={`form-input resize-none ${errors.description ? 'form-input-error' : ''}`} {...register('description')} />
        {errors.description && <p className="form-error">{errors.description.message}</p>}
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        <Button type="submit" variant="primary" loading={isSubmitting} className="flex-1">
          {isEditing ? 'Update' : 'Add'} education
        </Button>
      </div>
    </form>
  );
};

const EducationSection = ({ education: initialList, onListChange }) => {
  const [list,     setList]     = useState(initialList ?? []);
  const [drawer,   setDrawer]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openAdd  = ()      => { setEditing(null); setDrawer(true); };
  const openEdit = (item)  => { setEditing(item); setDrawer(true); };
  const closeDrawer = ()   => { setDrawer(false); setEditing(null); };

  const handleSaved = (item, action) => {
    const next = action === 'created' ? [...list, item] : list.map(e => e.id === item.id ? item : e);
    setList(next); onListChange?.(next);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await profileService.deleteEducation(deleting.id);
      const next = list.filter(e => e.id !== deleting.id);
      setList(next); onListChange?.(next);
    } finally { setDeleteLoading(false); setDeleting(null); }
  };

  return (
    <>
      <SectionCard
        title="Education"
        icon={GraduationCap}
        count={list.length}
        onAdd={openAdd}
        addLabel="Add education"
        isEmpty={list.length === 0}
        emptyState={
          <EmptyState
            icon={GraduationCap}
            message="No education records yet. Add your highest qualification."
            action={<button onClick={openAdd} className="btn-primary btn-sm">Add education</button>}
          />
        }
      >
        <div className="space-y-2">
          {list.map((edu) => (
            <ItemCard key={edu.id} onEdit={() => openEdit(edu)} onDelete={() => setDeleting(edu)}>
              <p className="font-medium text-sm text-brand-text">{edu.degree}{edu.fieldOfStudy ? `, ${edu.fieldOfStudy}` : ''}</p>
              <p className="text-sm text-brand-muted">{edu.institution}</p>
              <p className="text-xs text-brand-muted mt-0.5">
                {fmtDate(edu.startDate)} — {edu.graduationDate ? fmtDate(edu.graduationDate) : 'Present'}
                {edu.gpa && <span className="ml-2">· GPA: {edu.gpa}</span>}
              </p>
            </ItemCard>
          ))}
        </div>
      </SectionCard>

      <DrawerForm open={drawer} title={editing ? 'Edit Education' : 'Add Education'} onClose={closeDrawer}>
        {drawer && (
          <EducationForm
            defaultValues={editing ? {
              ...editing,
              startDate:      editing.startDate      ? new Date(editing.startDate).toISOString().split('T')[0]      : '',
              graduationDate: editing.graduationDate ? new Date(editing.graduationDate).toISOString().split('T')[0] : '',
            } : null}
            onSuccess={handleSaved}
            onClose={closeDrawer}
          />
        )}
      </DrawerForm>

      <ConfirmDialog
        open={!!deleting}
        title="Delete education?"
        message={deleting ? `Remove "${deleting.degree} at ${deleting.institution}"?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </>
  );
};

export default EducationSection;
