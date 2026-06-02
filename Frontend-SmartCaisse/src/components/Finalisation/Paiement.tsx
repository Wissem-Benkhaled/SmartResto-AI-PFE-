import React, { useEffect, useState } from 'react';
import { Box, Typography, Paper, Radio, FormControlLabel } from '@mui/material';

type PaiementDialogProps = {
  setPaiementMethode: (value: number) => void;
};

export default function PaymentMethodSelector({ setPaiementMethode }: PaiementDialogProps) {
  const [selected, setSelected] = useState('cash');
  useEffect(() => {
    setPaiementMethode(selected === 'cash' ? 0 : 1);
  }, [selected, setPaiementMethode]);

  const methods = [
    { id: 'cash', label: 'Espèces', img: '/assets/cash.png', icon: '💵' },
    { id: 'card', label: 'Carte', img: '/assets/carte.png', icon: '💳' },
  ];

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 'bold', display: 'block' }}>
        Méthode de paiement
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
        {methods.map((method) => (
          <Paper
            key={method.id}
            onClick={() => setSelected(method.id)}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
              border: 2,
              borderColor: selected === method.id ? method.label === 'Espèces' ? 'success.light' : 'rgb(89, 175, 195)' : 'grey.300',
              boxShadow: selected === method.id ? '0 4px 20px rgba(42, 98, 45, 0.3)' : 'none',
              transform: selected === method.id ? 'scale(1.02)' : 'scale(1)',
              bgcolor: selected === method.id ? method.label === 'Espèces' ? 'success.light' : 'rgb(89, 175, 195)' : 'grey.300',
              '&:hover': {
                borderColor: method.label === 'Espèces' ? 'success.light' : 'rgb(89, 175, 195)',
              }
            }}
          >
            <Box
              sx={{
                width: '100%',
                height: 70,
                backgroundImage: `url(${method.img})`,
                backgroundSize: 'cover',
                // backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                position: 'relative',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'flex-end',
              }}
            >
              <FormControlLabel
                control={
                  <Radio
                    checked={selected === method.id}
                    onChange={() => setSelected(method.id)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      color: 'white',
                      '&.Mui-checked': {
                        color: 'white',
                        textShadow: '0 0 8px rgba(46, 125, 50, 0.8)',
                      },
                      filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
                    }}
                  />
                }
                label=""
                sx={{ m: 0 }}
              />
            </Box>

            <Box sx={{ textAlign: 'center' }}>
              <Typography
                p={0.5}
                variant="body2"
                fontWeight={selected === method.id ? 700 : 500}
                color={selected === method.id ? method.label === 'Espèces' ? 'success.dark' : 'rgb(38, 72, 80)' : 'text.primary'}
              >
                {method.label}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mt: 1.5}}>
        {methods.map((method) => (
          <Paper
            key={method.id}
            onClick={() => setSelected(method.id)}
            sx={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              overflow: 'hidden',
              border: 2,
              borderColor: selected === method.id ? method.label === 'Espèces' ? 'success.light' : 'rgb(89, 175, 195)' : 'grey.300',
              boxShadow: selected === method.id ? '0 4px 20px rgba(42, 98, 45, 0.3)' : 'none',
              transform: selected === method.id ? 'scale(1.02)' : 'scale(1)',
              bgcolor: selected === method.id ? method.label === 'Espèces' ? 'success.light' : 'rgb(89, 175, 195)' : 'whiteSmoke',
              '&:hover': {
                borderColor: method.label === 'Espèces' ? 'success.light' : 'rgb(89, 175, 195)',
              }
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography fontSize="1.5rem" p={1} >
                {method.icon}
              </Typography>
              <Typography
                // p={0.5}
                variant="body2"
                fontWeight={selected === method.id ? 700 : 500}
                color={selected === method.id ? method.label === 'Espèces' ? 'success.dark' : 'rgb(38, 72, 80)' : 'text.primary'}
              >
                {method.label}
              </Typography>
            </Box>
          </Paper>
        ))}
      </Box> */}
    </Box>
  );
};