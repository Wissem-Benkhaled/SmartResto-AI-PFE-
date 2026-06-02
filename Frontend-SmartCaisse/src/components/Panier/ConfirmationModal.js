"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogTitle from "@mui/material/DialogTitle";

export default function ConfirmationModal({
    open,
    onClose,
    onConfirm
}) {


    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
        >
            <DialogTitle sx={{ fontWeight: 700 }}>Confirmer le vidage du panier</DialogTitle>

            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} color="inherit" variant="contained">
                    Annuler
                </Button>
                <Button onClick={onConfirm} variant="contained" color="error" sx={{ gap: 1 }}>
                    Vider
                </Button>
            </DialogActions>
        </Dialog>
    );
}
