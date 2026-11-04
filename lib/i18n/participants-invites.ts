import type { Locale, BoardCopy } from "./types"

export const participantsInvitesCopy = {
  ru: {
    participantsTitle: "Участники",
    participantsShow: "Показать",
    participantsHide: "Скрыть",
    onlyYou: "Пока на доске только вы.",
    youLabel: "Вы",
    inviteMember: "Пригласить участника",
    inviteEmailPlaceholder: "Email",
    inviteButton: "Пригласить",
    inviteSending: "Отправка...",
    removeMember: "Удалить",
    removeMemberTitle: "Удалить участника?",
    removeMemberDescription: "Участник потеряет доступ к этой доске.",
    removeMemberConfirm: "Удалить",
    leaveBoard: "Покинуть доску",
    leaveBoardTitle: "Покинуть доску?",
    leaveBoardDescription: "Вы потеряете доступ к этой доске.",
    leaveBoardConfirm: "Покинуть",
    leaveBoardSuccess: "Вы покинули доску.",
    invitationsTitle: "Приглашения",
    invitationsSubtitle: "Доступ появится после принятия приглашения.",
    acceptInvite: "Принять",
    declineInvite: "Отклонить",
    verifyEmailTitle: "Подтвердите email",
    verifyEmailDescription:
      "Приглашения на доски показываются только для подтверждённого адреса. Откройте ссылку из письма и нажмите «Я подтвердил».",
    verifyEmailResend: "Отправить письмо ещё раз",
    verifyEmailSent: "Письмо для подтверждения отправлено.",
    verifyEmailCheck: "Я подтвердил",
    verifyEmailPending: "Адрес ещё не подтверждён. Проверьте почту.",
    verifyEmailResendFailed: "Не удалось отправить письмо. Попробуйте позже.",
  },
  en: {
    participantsTitle: "Participants",
    participantsShow: "Show",
    participantsHide: "Hide",
    onlyYou: "You are the only participant for now.",
    youLabel: "You",
    inviteMember: "Invite member",
    inviteEmailPlaceholder: "Email",
    inviteButton: "Invite",
    inviteSending: "Sending...",
    removeMember: "Remove",
    removeMemberTitle: "Remove member?",
    removeMemberDescription: "This member will lose access to the board.",
    removeMemberConfirm: "Remove",
    leaveBoard: "Leave board",
    leaveBoardTitle: "Leave board?",
    leaveBoardDescription: "You will lose access to this board.",
    leaveBoardConfirm: "Leave",
    leaveBoardSuccess: "You left the board.",
    invitationsTitle: "Invitations",
    invitationsSubtitle: "Board access is granted only after acceptance.",
    acceptInvite: "Accept",
    declineInvite: "Decline",
    verifyEmailTitle: "Verify your email",
    verifyEmailDescription:
      "Board invitations are shown only for a verified address. Open the link in the email, then press “I've verified”.",
    verifyEmailResend: "Resend email",
    verifyEmailSent: "Verification email sent.",
    verifyEmailCheck: "I've verified",
    verifyEmailPending: "The address is not verified yet. Check your inbox.",
    verifyEmailResendFailed: "Could not send the email. Try again later.",
  },
} satisfies Record<
  Locale,
  Pick<
    BoardCopy,
    | "participantsTitle"
    | "participantsShow"
    | "participantsHide"
    | "onlyYou"
    | "youLabel"
    | "inviteMember"
    | "inviteEmailPlaceholder"
    | "inviteButton"
    | "inviteSending"
    | "removeMember"
    | "removeMemberTitle"
    | "removeMemberDescription"
    | "removeMemberConfirm"
    | "leaveBoard"
    | "leaveBoardTitle"
    | "leaveBoardDescription"
    | "leaveBoardConfirm"
    | "leaveBoardSuccess"
    | "invitationsTitle"
    | "invitationsSubtitle"
    | "acceptInvite"
    | "declineInvite"
    | "verifyEmailTitle"
    | "verifyEmailDescription"
    | "verifyEmailResend"
    | "verifyEmailSent"
    | "verifyEmailCheck"
    | "verifyEmailPending"
    | "verifyEmailResendFailed"
  >
>
