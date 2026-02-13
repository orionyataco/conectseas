import React, { useState } from 'react';
import { User } from '../types';
import { getUserProfile, updateProfile } from '../services/api';
import { Camera, Save, X, Edit2, Calendar, Mail, Hash, Award, User as UserIcon, FileText, Loader2, Briefcase, Plane } from 'lucide-react';

interface ProfileProps {
    user: User; // Current logged-in user
    targetUserId?: string | null;
    onUpdate: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user: currentUser, targetUserId, onUpdate }) => {
    const [user, setUser] = useState<User>(currentUser);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        nickname: '',
        email: '',
        bio: '',
        birthDate: '',
        mobilePhone: '',
        registrationNumber: '',
        appointmentDate: '',
        department: '',
        position: '',
    });

    // Vacation status state
    const [showVacationModal, setShowVacationModal] = useState(false);
    const [vacationData, setVacationData] = useState({
        vacationStatus: false,
        vacationMessage: '',
        vacationStartDate: '',
        vacationEndDate: '',
        publishToMural: false
    });

    const isOwnProfile = !targetUserId || targetUserId === currentUser.id;

    React.useEffect(() => {
        const idToFetch = targetUserId || currentUser.id;
        fetchUserProfile(idToFetch);
    }, [targetUserId, currentUser.id]);

    const fetchUserProfile = async (id: string) => {
        setFetching(true);
        setError(null);
        try {
            const data = await getUserProfile(id);
            setUser(data);
            resetFormData(data);
        } catch (err) {
            setError('Não foi possível carregar o perfil do usuário.');
        } finally {
            setFetching(false);
        }
    };

    const resetFormData = (userData: User) => {
        setFormData({
            nickname: userData.nickname || '',
            email: userData.email || '',
            bio: userData.bio || '',
            birthDate: userData.birth_date || '',
            mobilePhone: userData.mobile_phone || '',
            registrationNumber: userData.registration_number || '',
            appointmentDate: userData.appointment_date || '',
            department: userData.department || '',
            position: userData.position || '',
        });
    };

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
            data.append('email', formData.email);
            data.append('bio', formData.bio);
            data.append('birthDate', formData.birthDate);
            data.append('mobilePhone', formData.mobilePhone);
            data.append('registrationNumber', formData.registrationNumber);
            data.append('appointmentDate', formData.appointmentDate);
            data.append('department', formData.department);
            data.append('position', formData.position);

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
        // Para evitar problemas de fuso horário (UTC vs Local), pegamos apenas a parte da data YYYY-MM-DD
        const [year, month, day] = dateString.split(/[-T]/).map(Number);
        if (!year || !month || !day) return '';

        // Criar a data usando o construtor local (ano, mês 0-indexado, dia)
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('pt-BR');
    };

    const handleOpenVacationModal = () => {
        // Load current vacation data from user
        setVacationData({
            vacationStatus: user.vacation_status || false,
            vacationMessage: user.vacation_message || 'Estou de férias até [data]. Em caso de urgência, entre em contato com [responsável]. 🏖️',
            vacationStartDate: user.vacation_start_date || '',
            vacationEndDate: user.vacation_end_date || '',
            publishToMural: false
        });
        setShowVacationModal(true);
    };

    const handleSaveVacation = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/users/${user.id}/vacation-status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(vacationData)
            });

            const data = await response.json();

            if (data.success && data.user) {
                onUpdate(data.user);
                setUser(data.user);
                setSuccess(vacationData.vacationStatus ? 'Status de férias ativado!' : 'Status de férias desativado!');
                setShowVacationModal(false);
            } else {
                setError(data.message || 'Erro ao atualizar status de férias');
            }
        } catch (err) {
            setError('Erro ao salvar status de férias');
        } finally {
            setLoading(false);
        }
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
                        {!isEditing && isOwnProfile && (
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
                    <div className="relative -mt-20 mb-6 flex flex-col md:flex-row items-end md:items-end gap-6">
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

                        <div className="flex-1 pb-2 text-center md:text-left flex flex-col">
                            <h1 className="text-2xl font-bold text-slate-800 md:text-white md:mb-6 md:-translate-y-4">{user.name}</h1>
                            <div className="md:translate-y-2">
                                <p className="text-slate-500 font-medium">{user.role} - {user.position}</p>
                                <p className="text-slate-400 text-sm">{user.department}</p>

                                {/* Vacation Button (only for own profile) */}
                            </div>
                        </div>
                        {fetching && (
                            <div className="pb-2">
                                <Loader2 className="animate-spin text-blue-600" size={24} />
                            </div>
                        )}
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

                    {/* Vacation Message Display */}
                    {!!user.vacation_status && !!user.vacation_message && (
                        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Plane size={24} className="text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-bold text-blue-900 mb-2 text-lg">Status de Férias Ativo</h3>
                                    <p className="text-blue-700 whitespace-pre-wrap leading-relaxed">{user.vacation_message}</p>
                                    {(user.vacation_start_date || user.vacation_end_date) && (
                                        <div className="mt-3 flex items-center gap-2 text-sm text-blue-600">
                                            <Calendar size={14} />
                                            {user.vacation_start_date && <span>De: {formatDate(user.vacation_start_date)}</span>}
                                            {user.vacation_end_date && <span>Até: {formatDate(user.vacation_end_date)}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Main Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Public Info Section */}

                            {/* Apelido/Nickname */}
                            {(isEditing || !!user.nickname) && (
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
                            {(isEditing || !!user.bio) && (
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
                                        <p className="text-slate-600 leading-relaxed">
                                            {user.bio}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Email */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                    <Mail size={16} className="text-slate-400" />
                                    Email Institucional
                                </label>
                                {isEditing ? (
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Ex: joao@seas.ap.gov.br"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    />
                                ) : (
                                    <p className="text-slate-800">
                                        {user.email}
                                    </p>
                                )}
                            </div>

                            {/* Matrícula */}
                            {(isEditing || !!user.registration_number) && (
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

                            {/* Departamento */}
                            {(isEditing || user.department) && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <Award size={16} className="text-blue-500" />
                                        Departamento
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="department"
                                            value={formData.department}
                                            onChange={handleInputChange}
                                            placeholder="Ex: Recursos Humanos"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    ) : (
                                        <p className="text-slate-800">{user.department}</p>
                                    )}
                                </div>
                            )}

                            {/* Cargo */}
                            {(isEditing || user.position) && (
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <Briefcase size={16} className="text-teal-500" />
                                        Cargo / Função
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="position"
                                            value={formData.position}
                                            onChange={handleInputChange}
                                            placeholder="Ex: Analista Administrativo"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        />
                                    ) : (
                                        <p className="text-slate-800">{user.position}</p>
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

                        {isEditing && isOwnProfile && (
                            <div className="mt-8 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center gap-4 text-center">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                                    <Plane size={24} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800">Gerenciar Férias</h4>
                                    <p className="text-sm text-slate-500">Configure sua mensagem de ausência e período de descanso.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleOpenVacationModal}
                                    className="bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm"
                                >
                                    <Plane size={18} />
                                    {user.vacation_status ? 'Ajustar Detalhes de Férias' : 'Configurar Férias'}
                                </button>
                            </div>
                        )}

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
                                            department: user.department || '',
                                            position: user.position || '',
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

            {/* Vacation Status Modal */}
            {
                showVacationModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg">
                                            <Plane size={24} className="text-blue-600" />
                                        </div>
                                        <h2 className="text-2xl font-bold text-slate-800">Status de Férias</h2>
                                    </div>
                                    <button
                                        onClick={() => setShowVacationModal(false)}
                                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* Vacation Status Toggle */}
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <div>
                                        <h3 className="font-semibold text-slate-800">Ativar Status de Férias</h3>
                                        <p className="text-sm text-slate-500">Exibir status de férias no seu perfil</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={vacationData.vacationStatus}
                                            onChange={(e) => setVacationData({ ...vacationData, vacationStatus: e.target.checked })}
                                            className="sr-only peer"
                                        />
                                        <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {/* Vacation Message */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Mensagem de Férias
                                    </label>
                                    <p className="text-xs text-slate-500 mb-2">
                                        Personalize sua mensagem. Você pode usar emojis! 😊🏖️✈️🌴
                                    </p>
                                    <textarea
                                        value={vacationData.vacationMessage}
                                        onChange={(e) => setVacationData({ ...vacationData, vacationMessage: e.target.value })}
                                        disabled={!vacationData.vacationStatus}
                                        rows={4}
                                        placeholder="Ex: Estou de férias até 20/02! Em caso de urgência, entre em contato com João. 🏖️"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                </div>

                                {/* Date Range */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-700">
                                            Data de Início (Opcional)
                                        </label>
                                        <input
                                            type="date"
                                            value={vacationData.vacationStartDate ? vacationData.vacationStartDate.split('T')[0] : ''}
                                            onChange={(e) => setVacationData({ ...vacationData, vacationStartDate: e.target.value })}
                                            disabled={!vacationData.vacationStatus}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-slate-700">
                                            Data de Fim (Opcional)
                                        </label>
                                        <input
                                            type="date"
                                            value={vacationData.vacationEndDate ? vacationData.vacationEndDate.split('T')[0] : ''}
                                            onChange={(e) => setVacationData({ ...vacationData, vacationEndDate: e.target.value })}
                                            disabled={!vacationData.vacationStatus}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                {/* Publish to Mural Checkbox */}
                                {vacationData.vacationStatus && (
                                    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                                        <input
                                            type="checkbox"
                                            id="publishToMural"
                                            checked={vacationData.publishToMural}
                                            onChange={(e) => setVacationData({ ...vacationData, publishToMural: e.target.checked })}
                                            className="mt-1 w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500"
                                        />
                                        <label htmlFor="publishToMural" className="flex-1 cursor-pointer">
                                            <span className="font-semibold text-blue-900">Publicar também no Mural</span>
                                            <p className="text-sm text-blue-700 mt-1">
                                                Criar uma publicação automática informando suas férias para todos os usuários
                                            </p>
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setShowVacationModal(false)}
                                    className="px-6 py-3 text-slate-600 font-semibold hover:bg-slate-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveVacation}
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center gap-2 disabled:opacity-70"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={18} className="animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            Salvar
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default Profile;
