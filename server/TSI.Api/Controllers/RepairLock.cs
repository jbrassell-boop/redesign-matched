namespace TSI.Api.Controllers;

/// <summary>
/// Repair edit-lock rule: a repair is read-only once its invoice is FINALIZED.
///
/// Deliberately NOT part of this rule: <c>tblRepair.sRepairClosed</c>.
/// Legacy WSRepairOpen drives that column from a plain "Closed Repair" checkbox
/// (chkClosedRepair — loaded at :9172, saved at :17333). Across the whole legacy
/// form, being closed disables no control and blocks no save; its only
/// behavioural effect is at :17116, where it RELAXES a rack-position-in-use
/// warning. Users tick it, save, untick it later and keep editing.
///
/// So closing must not lock. 215,319 of 216,497 repairs carry sRepairClosed='Y'
/// — gating writes on it would make 99.5% of the repair database uneditable and
/// leave this system strictly LESS capable than the one it replaces. Closed is
/// surfaced as a state (pipeline pill / header badge / Outgoing label), nothing
/// more.
///
/// The finalized-invoice half is a different animal: that invoice snapshot is
/// settled and already pushed, so re-driving the billed figures behind it is an
/// accounting fault rather than an edit.
/// </summary>
public static class RepairLock
{
    public static bool IsReadOnly(bool invoiceFinalized) => invoiceFinalized;
}
