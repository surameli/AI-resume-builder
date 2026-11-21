/**
 * CertificationsSection — lists certifications with add/edit/delete.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Award, ExternalLink } from 'lucide-react';
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
  name:           z.string().min(1, 'Certification name is required').max(200).trim(),
  issuingOrg:     z.string().min(1, 'Issuing organization is required').max(200).trim(),
  issueDate:      z.string().optional().nullable(),
  expirationDate: z.string().optional().nullable(),
  credentialUrl:  urlOpt,
});

const CertificationForm = ({ defaultValues, onSuccess, onClose }) => {
  const [serverError, setServerError] = useState('');
  const isEditing = !!defaultValues?.id;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues ?? {},
  });

  const onSubmit = async (data) => {
    setServerError('');
    const payload = {
      ...data,
      issueDate:      data.issueDate      || null,
      expirationDate: data.expirationDate || null,
      credentialUrl:  data.credentialUrl  || null,
    };
    try {
      let res;
      if (isEditing) {
        res = await profileService.updateCertification(defaultValues.id, payload);
        onSuccess(res.data.data.certification, 'updated');
      } else {
        res = await profileService.createCertification(payload);
        onSuccess(res.data.data.certification, 'created');
      }
      onClose();
    } catch (err) { setServerError(err?.response?.data?.message ?? 'Failed to save.'); }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && <Alert type="error" message={serverError} dismissible />}
      <FormField label="Certification name" name="name" placeholder="AWS Solutions Architect Associate" register={register} error={errors.name} required />
      <FormField label="Issuing organization" name="issuingOrg" placeholder="Amazon Web Services" register={register} error={errors.issuingOrg} required />
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Issue date"      name="issueDate"      type="date" register={register} error={errors.issueDate}      />
        <FormField label="Expiration date" name="expirationDate" type="date" register={register} error={errors.expirationDate} />
      </div>
      <FormField label="Credential URL" name="credentialUrl" type="url" placeholder="https://credly.com/badges/..." register={register} error={errors.credentialUrl} hint="Link to your digital badge or credential (optional)" />
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
        <Button type="submit" variant="primary" loading={isSubmitting} className="flex-1">
          {isEditing ? 'Update' : 'Add'} certification
        </Button>
      </div>
    </form>
  );
};

const CertificationsSection = ({ certifications: initialList, onListChange }) => {
  const [list,     setList]     = useState(initialList ?? []);
  const [drawer,   setDrawer]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const openAdd  = ()     => { setEditing(null); setDrawer(true); };
  const openEdit = (item) => { setEditing(item); setDrawer(true); };
  const closeDrawer = ()  => { setDrawer(false); setEditing(null); };

  const handleSaved = (item, action) => {
    const next = action === 'created' ? [...list, item] : list.map(c => c.id === item.id ? item : c);
    setList(next); onListChange?.(next);
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await profileService.deleteCertification(deleting.id);
      const next = list.filter(c => c.id !== deleting.id);
      setList(next); onListChange?.(next);
    } finally { setDeleteLoading(false); setDeleting(null); }
  };

  return (
    <>
      <SectionCard
        title="Certifications"
        icon={Award}
        count={list.length}
        onAdd={openAdd}
        addLabel="Add certification"
        isEmpty={list.length === 0}
        emptyState={
          <EmptyState
            icon={Award}
            message="No certifications added yet. Add any professional credentials you hold."
            action={<button onClick={openAdd} className="btn-primary btn-sm">Add certification</button>}
          />
        }
      >
        <div className="space-y-2">
          {list.map((cert) => (
            <ItemCard key={cert.id} onEdit={() => openEdit(cert)} onDelete={() => setDeleting(cert)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-brand-text truncate">{cert.name}</p>
                  <p className="text-sm text-brand-muted">{cert.issuingOrg}</p>
                  <p className="text-xs text-brand-muted mt-0.5">
                    {cert.issueDate && `Issued ${fmtDate(cert.issueDate)}`}
                    {cert.issueDate && cert.expirationDate && ' · '}
                    {cert.expirationDate && `Expires ${fmtDate(cert.expirationDate)}`}
                  </p>
                </div>
                {cert.credentialUrl && (
                  <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:underline shrink-0" onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </ItemCard>
          ))}
        </div>
      </SectionCard>

      <DrawerForm open={drawer} title={editing ? 'Edit Certification' : 'Add Certification'} onClose={closeDrawer}>
        {drawer && (
          <CertificationForm
            defaultValues={editing ? {
              ...editing,
              issueDate:      editing.issueDate      ? new Date(editing.issueDate).toISOString().split('T')[0]      : '',
              expirationDate: editing.expirationDate ? new Date(editing.expirationDate).toISOString().split('T')[0] : '',
            } : null}
            onSuccess={handleSaved}
            onClose={closeDrawer}
          />
        )}
      </DrawerForm>

      <ConfirmDialog
        open={!!deleting}
        title="Delete certification?"
        message={deleting ? `Remove "${deleting.name}"?` : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
        loading={deleteLoading}
      />
    </>
  );
};

export default CertificationsSection;
