import React, { useState } from 'react';
import { User } from '../types';
import { updateProfile } from '../services/api';
import { Camera, Save, X, Edit2, Calendar, Mail, Hash, Award, User as UserIcon, FileText } from 'lucide-react';

interface ProfileProps {
    user: User;
    onUpdate: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nickname: user.nickname || '',
        bio: user.bio || '',
        birthDate: user.birth_date || '',
        mobilePhone: user.mobile_phone || '',
        registrationNumber: user.registration_number || '',
        appointmentDate: user.appointment_date || '',
    });

    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setAvatarFile(file);
            setPreviewAvatar(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const data = new FormData();
            data.append('nickname', formData.nickname);
            data.append('bio', formData.bio);
            data.append('birthDate', formData.birthDate);
            data.append('mobilePhone', formData.mobilePhone);
            data.append('registrationNumber', formData.registrationNumber);
            data.append('appointmentDate', formData.appointmentDate);

            if (avatarFile) {
                data.append('avatar', avatarFile);
            }

            const response = await updateProfile(user.id, data);

            if (response.success && response.user) {
                onUpdate(response.user);
                setSuccess('Perfil atualizado com sucesso!');
                setIsEditing(false);
                // Clear preview only if saved, essentially local user state handles it now
                setPreviewAvatar(null);
            } else {
                setError(response.message || 'Erro ao atualizar perfil');
            }
        } catch (err) {
            setError('Erro inesperado ao salvar');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('pt-BR');
    };

    // Visibility Check: Only show if field is present or if we are the owner (which we are)
    // But requirement says: "o campo que não for preenchido não será visivil a todos"
    // Assuming this component is "My Profile", we see everything in Edit mode.
    // In View mode, we hide empty fields.

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header / Cover */}
                <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative">
                    <div className="absolute top-4 right-4">
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl backdrop-blur-sm flex items-center gap-2 transition-all font-medium text-sm"
                            >
                                <Edit2 size={16} />
                                Editar Perfil
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-8 pb-8">
                    <div className="relative -mt-16 mb-6 flex flex-col md:flex-row items-end md:items-end gap-6">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-3xl border-4 border-white shadow-lg overflow-hidden bg-white">
                                <img
                                    src={previewAvatar || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random`}
                                    alt={user.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            {isEditing && (
                                <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-3xl">
                                    <Camera size={24} />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                </label>
                            )}
                        </div>

                        <div className="flex-1 pb-2 text-center md:text-left">
                            <h1 className="text-2xl font-bold text-slate-800">{user.name}</h1>
                            <p className="text-slate-500 font-medium">{user.role} - {user.position}</p>
                            <p className="text-slate-400 text-sm">{user.department}</p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-center gap-2 animate-fadeIn">
                            <X size={18} />
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 text-green-600 rounded-xl border border-green-100 flex items-center gap-2 animate-fadeIn">
                            <Save size={18} />
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Main Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Public Info Section */}

                            {/* Apelido/Nickname */}
                            {(isEditing || user.nickname) && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <UserIcon size={16} className="text-blue-500" />
                                        Apelido (Como prefere ser chamado)
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="nickname"
                                            value={formData.nickname}
                                            onChange={handleInputChange}
                                            placeholder="Ex: Beto"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    ) : (
                                        <p className="text-lg text-slate-800">{user.nickname}</p>
                                    )}
                                </div>
                            )}

                            {/* Bio */}
                            {(isEditing || user.bio) && (
                                <div className="space-y-2 md:col-span-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <FileText size={16} className="text-purple-500" />
                                        Sobre Mim (Bio)
                                    </label>
                                    {isEditing ? (
                                        <textarea
                                            name="bio"
                                            value={formData.bio}
                                            onChange={handleInputChange}
                                            rows={3}
                                            placeholder="Conte um pouco sobre você..."
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                        />
                                    ) : (
                                        <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            {user.bio}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Official Data */}
                            {/* Email - Always visible usually, but assuming read-only is fine */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <Mail size={16} className="text-slate-400" />
                                    Email Institucional
                                </label>
                                <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500">
                                    {user.email}
                                </div>
                            </div>

                            {/* Matrícula */}
                            {(isEditing || user.registration_number) && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <Hash size={16} className="text-orange-500" />
                                        Matrícula
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="registrationNumber"
                                            value={formData.registrationNumber}
                                            onChange={handleInputChange}
                                            placeholder="000000"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    ) : (
                                        <p className="text-slate-800 font-mono">{user.registration_number}</p>
                                    )}
                                </div>
                            )}

                            {/* Data de Nascimento */}
                            {(isEditing || user.birth_date) && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <Calendar size={16} className="text-pink-500" />
                                        Data de Nascimento
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            name="birthDate"
                                            value={formData.birthDate ? formData.birthDate.split('T')[0] : ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    ) : (
                                        <p className="text-slate-800">{formatDate(user.birth_date)}</p>
                                    )}
                                </div>
                            )}

                            {/* Data de Nomeação */}
                            {(isEditing || user.appointment_date) && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <Award size={16} className="text-yellow-500" />
                                        Data de Nomeação
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            name="appointmentDate"
                                            value={formData.appointmentDate ? formData.appointmentDate.split('T')[0] : ''}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    ) : (
                                        <p className="text-slate-800">{formatDate(user.appointment_date)}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {isEditing && (
                            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFormData({
                                            nickname: user.nickname || '',
                                            bio: user.bio || '',
                                            birthDate: user.birth_date || '',
                                            mobilePhone: user.mobile_phone || '',
                                            registrationNumber: user.registration_number || '',
                                            appointmentDate: user.appointment_date || '',
                                        });
                                        setPreviewAvatar(null);
                                        setAvatarFile(null);
                                    }}
                                    className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-70"
                                >
                                    {loading ? 'Salvando...' : (
                                        <>
                                            <Save size={18} />
                                            Salvar Alterações
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
