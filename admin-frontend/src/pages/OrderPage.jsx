

import React, { useState } from "react";
import { useQuery, gql } from "@apollo/client";
import {
  Box,
  Button,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  Modal,
  Divider,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import { Refresh, Visibility, Description } from "@mui/icons-material";

const GET_ALL_ORDERS = gql`
  query GetAllOrders {
    orders {
      orderId
      status
      totalAmount
      createdAt

      buyer {
        name
        email
      }

      items {
        name
        quantity
        image
        status
        rejectReason
        cancelReason
      }

      payment {
        mode
        status
      }

      invoiceUrl
    }
  }
`;

const STATUS_TABS = [
  "all",
  "pending",
  "packed",
  "shipped",
  "delivered",
  "rejected",
  "cancelled",
];

const statusColor = (s) =>
({
  delivered: "success",
  shipped: "info",
  packed: "secondary",
  pending: "warning",
  cancelled: "error",
  rejected: "error",
}[s] || "default");

const paymentColor = (s) =>
({
  paid: "success",
  pending: "warning",
  failed: "error",
  refunded: "default",
}[s] || "default");

export default function AdminOrderPage() {
  const { data, loading, error, refetch } = useQuery(GET_ALL_ORDERS, {
    pollInterval: 5000,
  });

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState("all");

  if (loading) return <Typography p={4}>Loading Orders…</Typography>;
  if (error)
    return (
      <Typography p={4} color="error">
        Error loading orders
      </Typography>
    );

  const filteredOrders = data.orders.filter((o) => {
    const matchesSearch =
      o.orderId.toLowerCase().includes(search.toLowerCase()) ||
      o.buyer?.name?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = tab === "all" || o.status === tab;

    return matchesSearch && matchesStatus;
  });

  return (
    <Box p={4}>
      <Typography variant="h4" mb={2} sx={{ color: "#fff" }}>
        📦 Admin Orders
      </Typography>


      {/* SEARCH + REFRESH */}
      <Box display="flex" gap={2} mb={2}>
        <TextField
          fullWidth
          placeholder="Search by Order ID / Buyer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            input: { color: "#fff" },
            "& .MuiOutlinedInput-root": {
              "& fieldset": { borderColor: "#fff" },
            },
            "& .MuiInputLabel-root": { color: "#fff" },
            "& ::placeholder": { color: "#ccc", opacity: 1 },
          }}
        />

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={refetch}
        >
          Refresh
        </Button>
      </Box>

      {/* STATUS TABS */}
      <Tabs
  value={tab}
  onChange={(e, v) => setTab(v)}
  variant="scrollable"
  sx={{
    mb: 2,
    minHeight: 36,
    "& .MuiTabs-indicator": {
      backgroundColor: "#fff",   // underline color
      height: 3,
    },
  }}
>
  {STATUS_TABS.map((s) => (
    <Tab
      key={s}
      value={s}
      disableRipple
      label={s.toUpperCase()}
      sx={{
        color: "#fff",
        textTransform: "uppercase",
        minHeight: 36,
        fontWeight: 500,

        "&.Mui-selected": {
          color: "#fff",          // selected text white
          backgroundColor: "transparent", // ❌ remove blue bg
        },

        "&:hover": {
          backgroundColor: "transparent", // ❌ remove hover bg
        },

        "&.Mui-focusVisible": {
          backgroundColor: "transparent", // ❌ remove focus bg
        },
      }}
    />
  ))}
</Tabs>


      {/* TABLE */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order</TableCell>
              <TableCell>Buyer</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Payment</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Date</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredOrders.map((o) => (
              <TableRow key={o.orderId}>
                <TableCell>{o.orderId}</TableCell>

                <TableCell>
                  <Typography>{o.buyer?.name}</Typography>
                  <Typography variant="caption">{o.buyer?.email}</Typography>
                </TableCell>

                <TableCell>
                  ₹{o.totalAmount?.toLocaleString()}
                </TableCell>

                {/* PAYMENT STATUS */}
                <TableCell>
                  <Chip
                    label={`${o.payment?.mode || "N/A"} - ${o.payment?.status || "N/A"
                      }`}
                    color={paymentColor(o.payment?.status)}
                    sx={{ color: "#fff", fontWeight: 500 }}
                  />
                </TableCell>

                {/* ORDER STATUS */}
                <TableCell>
                  <Chip
                    label={o.status}
                    color={statusColor(o.status)}
                    sx={{ color: "#fff", fontWeight: 500 }}
                  />
                </TableCell>

                <TableCell>
                  {new Date(o.createdAt).toLocaleDateString()}
                </TableCell>

                <TableCell>
                  <Button
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => setSelected(o)}
                  >
                    View
                  </Button>
                  {o.invoiceUrl && (
                    <Button
                      size="small"
                      startIcon={<Description />}
                      href={o.invoiceUrl}
                      target="_blank"
                    >
                      Invoice
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {filteredOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No orders found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ORDER DETAILS MODAL */}
      <Modal open={!!selected} onClose={() => setSelected(null)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%",
            maxWidth: 900,
            bgcolor: "background.paper",
            p: 4,
            borderRadius: 2,
          }}
        >
          {selected && (
            <>
              <Typography variant="h5">
                Order {selected.orderId}
              </Typography>
              <Divider sx={{ my: 2 }} />

              {selected.items.map((i, idx) => (
                <Paper key={idx} sx={{ p: 2, mb: 1 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={2}>
                      <img
                        src={i.image || "https://via.placeholder.com/80"}
                        width="80"
                        alt=""
                      />
                    </Grid>

                    <Grid item xs={6}>
                      <Typography>{i.name}</Typography>
                      <Typography variant="caption">
                        Qty: {i.quantity}
                      </Typography>
                      {i.rejectReason && (
                        <Typography color="error">
                          ❌ {i.rejectReason}
                        </Typography>
                      )}
                      {i.cancelReason && (
                        <Typography color="error">
                          ⚠️ {i.cancelReason}
                        </Typography>
                      )}
                    </Grid>

                    <Grid item xs={4}>
                      <Chip
                        label={i.status}
                        color={statusColor(i.status)}
                        sx={{ color: "#fff", fontWeight: 500 }}
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}

              <Box textAlign="right" mt={2}>
                <Button onClick={() => setSelected(null)}>Close</Button>
              </Box>
            </>
          )}
        </Box>
      </Modal>
    </Box>
  );
}