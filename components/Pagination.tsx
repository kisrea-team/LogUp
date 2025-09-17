import React from 'react';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination';
interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

const Paginations: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
}) => {
    const getPageNumbers = () => {
        const pages: Array<number | 'ellipsis'> = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= Math.max(totalPages, 1); i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= Math.min(maxVisiblePages, totalPages); i++) {
                    pages.push(i);
                }
                if (totalPages > maxVisiblePages) {
                    pages.push('ellipsis');
                    pages.push(totalPages);
                }
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('ellipsis');
                for (let i = totalPages - maxVisiblePages + 2; i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('ellipsis');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i);
                }
                pages.push('ellipsis');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();
    const isFirstPage = currentPage <= 1;
    const isLastPage = currentPage >= Math.max(totalPages, 1);

    const handleClick = (e: React.MouseEvent, page: number) => {
        e.preventDefault();
        if (page < 1 || page > Math.max(totalPages, 1) || page === currentPage) return;
        onPageChange(page);
    };

    return (
        <div className="flex flex-col items-center my-8">
            <div className="text-sm text-gray-600 mb-2">
                共 {totalItems} 个项目，第 {Math.max(currentPage, 1)} 页，共{' '}
                {Math.max(totalPages, 1)} 页
            </div>

            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={(e) => !isFirstPage && handleClick(e, currentPage - 1)}
                            className={isFirstPage ? 'pointer-events-none opacity-50' : ''}
                        />
                    </PaginationItem>

                    {pageNumbers.map((page, index) => (
                        <PaginationItem
                            key={`${page}-${index}`}
                            className=" hover:bg-gray-100 rounded-md transition-all"
                        >
                            {page === 'ellipsis' ? (
                                <PaginationEllipsis />
                            ) : (
                                <PaginationLink
                                    href="#"
                                    isActive={currentPage === page}
                                    onClick={(e) => handleClick(e, page as number)}
                                >
                                    {page}
                                </PaginationLink>
                            )}
                        </PaginationItem>
                    ))}

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={(e) => !isLastPage && handleClick(e, currentPage + 1)}
                            className={isLastPage ? 'pointer-events-none opacity-50' : ''}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>
        </div>
    );
};

export default Paginations;
