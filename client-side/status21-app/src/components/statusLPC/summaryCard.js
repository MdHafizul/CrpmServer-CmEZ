import {useState, useEffect} from 'react';
import Snackbar from '../snackBar'; 
import {apiFetch} from '@/utils/api';

export default function SummaryCards(){
    const [isLoading, setIsLoading] = useState(false);  
    const [totals, setTotals] = useState({
        totalAccounts: 0,
        totalUnpaid: 0,
        totalPayment: 0,
        totalBalance: 0,
    }); 

    const [snackbar, setSnackbar] = useState({ message: '', type: '' });

    const fetchFileData = async () => {
        setIsLoading(true);

        try {
            const results = {};

            const response = await apiFetch('/api/v2/statusLPC/summary-card', {
                method: 'GET',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch data for type: summary-card');
            }

            const result = await response.json();

            const totalAccounts = Object.values(result?.BACount || {}).reduce(
                (sum, area) => sum + area.total,
                0
            );
            const totalUnpaid = Object.values(result?.BACount || {}).reduce(
                (sum, area) => sum + area.unpaid,
                0
            );
            const totalPayment = Object.values(result?.BACount || {}).reduce(
                (sum, area) => sum + area.payment,
                0
            );
            const totalBalance = Object.values(result?.BACount || {}).reduce(
                (sum, area) => sum + area.balance,
                0
            );
        } catch (error) {
            console.error('Error fetching file data:', error);
            setSnackbar({ message: error.message, type: 'error' });
        }
    }
}