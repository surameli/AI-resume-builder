/**
 * ProjectsSection — lists projects with add/edit/delete and technology tags.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FolderOpen, ExternalLink, Plus, X } from 'lucide-react';
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

const urlOpt = z.string().url('Must be a valid URL').optional().nullable().or(z.literal(''));
const schema = z.object({
  name:        z.string().min(1, 'Project name is required').max(150).trim(),
  description: z.string().max(3000).trim().optional().nullable(),
  projectUrl:  urlOpt,
  startDate:   z.string().optional().nullable(),
  endDate:     z.string().optional().nullable(),
});

const ProjectForm = ({ defaultValues, onSuccess, onClose }) => {
  const isEditing = !!defaultValues?.id;
  const [serverError, setServerError] = useState('');
  // Tech tags managed as local state (not part of RHF schema)
  const [techInput, setTechInput] = useState('');
  const [techList,  setTechList]  = useState(defaultValues?.technologies ?? []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  const addTech = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = techInput.trim().replace(/,$/, '');
      if (val && !techList.includes(val) && techList.length < 30) {
        setTechList(p => [...p, val]);
      }
      setTechInput('');
    }
  };

  const onSubmit = async (data) => {
    setServerError('');
    const payload = { ...data, technologies: techList, startDate: data.startDate || null, endDate: data.endDate || null, projectUrl: data.projectUrl || null };
    try {
      let res;
      if (isEditing) {
        res = await profileService.updateProject(defaultValues.id, payload);
        onSuccess(res.data.data.project, 'updated');
      } else {
        res = await profileService.createProject(payload);
        onSuccess(res.data.data.project, 'created');
      }
      onClose();
    } catch (err) { setServerError(err?.response?.data?.message ?? 'Failed to save.'); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <Alert type="error" message={serverError} dismissible />}
      <FormField label="Project name" name="name" placeholder="CareerCraft AI" register={register} error={errors.name} required />
      <div className="space-y-1">
        <label className="form-label">Description</label>
        <textarea rows={3} placeholder="What does this project do? What problem does it solve?" className={`form-input resize-none ${errors.description ? 'form-input-error' : ''}`} {...register('description')} />
        {errors.description && <p className="form-error">{errors.description.message}</p>}
      </div>

      {/* Technologies tag input */}
      <div className="space-y-1">
        <label className="form-label">Technologies used</label>
        <input
          className="form-input"
          placeholder="Type a technology and press Enter or comma"
          value={techInput}
          onChange={e => setTechInput(e.target.value)}
          onKeyDown={addTech}
        />
        {techList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {techList.map(t => (
              <span key={t} className="badge badge-blue flex items-center gap-1">
                {t}
                <button type="button" onClick={() => setTechList(p => p.filter(x => x !== t))} aria-label={`Remove ${t}`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="form-hint">Press Enter or comma after each technology name.</p>
      </div>

      <FormField label="Project URL" name="projectUrl" type="url" placeholder="https://github.com/you/project" register={register} error={errors.projectUrl} />
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Start date" name="startDate" type="date" register={register} error={errors.startDate} />
        <FormField label="End date"   name="endDate"   type="date" register={register} error={errors.endDate}   />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        <Button type="submit" variant="primary" loading={isSubmitting} className="flex-1">
          {isEditing ? 'Update' : 'Add'} project
        </Button>
      </div>
    </form>
  );
};

const ProjectsSection = ({ projects: initialList, onListChange }) => {
  const [list,     setList]     = useState(initialList ?? []);
  const [drawer,   setDrawer]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openAdd  = ()     => { setEditing(null); setDrawer(true); };
  const openEdit = (item) => { setEditing(item); setDrawer(true); };
  const closeDrawer = ()  => { setDrawer(false); setEditing(null); };

  const handleSaved = (item, action) => {
    const next = action === 'created' ? [...list, item] : list.map(p => p.id === item.id ? item : p);
    setList(next); onListChange?.(next);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await profileService.deleteProject(deleting.id);
      const next = list.filter(p => p.id !== deleting.id);
      setList(next); onListChange?.(next);
    } finally { setDeleteLoading(false); setDeleting(null); }
  };

  return (
    <>
      <SectionCard
        title="Projects"
        icon={FolderOpen}
        count={list.length}
        onAdd={openAdd}
        addLabel="Add project"
        isEmpty={list.length === 0}
        emptyState={
          <EmptyState
            icon={FolderOpen}
            message="No projects added yet. Showcase your personal or professional projects."
            action={<button onClick={openAdd} className="btn-primary btn-sm">Add project</button>}
          />
        }
      >
        <div className="space-y-2">
          {list.map((proj) => (
            <ItemCard key={proj.id} onEdit={() => openEdit(proj)} onDelete={() => setDeleting(proj)}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm text-brand-text">{proj.name}</p>
                {proj.projectUrl && (
                  <a href={proj.projectUrl} target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:underline shrink-0" onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              {proj.description && <p className="text-xs text-brand-muted mt-1 line-clamp-2">{proj.description}</p>}
              {proj.technologies?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {proj.technologies.map(t => <span key={t} className="badge badge-blue text-[10px]">{t}</span>)}
                </div>
              )}
              {(proj.startDate || proj.endDate) && (
                <p className="text-xs text-brand-muted mt-1">
                  {fmtDate(proj.startDate)}{proj.startDate && proj.endDate ? ' — ' : ''}{fmtDate(proj.endDate)}
                </p>
              )}
            </ItemCard>
          ))}
        </div>
      </SectionCard>

      <DrawerForm open={drawer} title={editing ? 'Edit Project' : 'Add Project'} onClose={closeDrawer}>
        {drawer && (
          <ProjectForm
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
        title="Delete project?"
        message={deleting ? `Remove "${deleting.name}"?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </>
  );
};

export default ProjectsSection;
