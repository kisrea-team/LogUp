import React from 'react';
import { Button } from '@/components/ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange
}) => {
  // Handle edge cases - always show pagination for testing
  if (totalPages <= 1) {
    return (
      <div className="flex flex-col items-center my-8">
        <div className="text-sm text-gray-600 mb-2">
          共 {totalItems} 个项目，第 1 页，共 {totalPages} 页
        </div>

        <div className="flex items-center space-x-1">
          <Button
            onClick={() => onPageChange(1)}
            disabled={true}
            variant="outline"
            size="sm"
          >
            首页
          </Button>

          <Button
            onClick={() => onPageChange(1 - 1)}
            disabled={true}
            variant="outline"
            size="sm"
          >
            上一页
          </Button>

          <Button
            onClick={() => onPageChange(1)}
            variant="default"
            size="sm"
          >
            1
          </Button>

          <Button
            onClick={() => onPageChange(1 + 1)}
            disabled={true}
            variant="outline"
            size="sm"
          >
            下一页
          </Button>

          <Button
            onClick={() => onPageChange(1)}
            disabled={true}
            variant="outline"
            size="sm"
          >
            末页
          </Button>
        </div>
      </div>
    );
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page, current page, and last page with ellipses
      if (currentPage <= 3) {
        // Near the beginning
        for (let i = 1; i <= Math.min(maxVisiblePages, totalPages); i++) {
          pages.push(i);
        }
        if (totalPages > maxVisiblePages) {
          pages.push('ellipsis');
          pages.push(totalPages);
        }
      } else if (currentPage >= totalPages - 2) {
        // Near the end
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - maxVisiblePages + 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle
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

  return (
    <div className="flex flex-col items-center my-8">
      <div className="text-sm text-gray-600 mb-2">
        共 {totalItems} 个项目，第 {currentPage} 页，共 {totalPages} 页
      </div>
      
      <div className="flex items-center space-x-1">
        <Button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
        >
          首页
        </Button>
        
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
        >
          上一页
        </Button>
        
        {pageNumbers.map((page, index) => (
          <React.Fragment key={index}>
            {page === 'ellipsis' ? (
              <span className="px-2 py-1 text-gray-500">...</span>
            ) : (
              <Button
                onClick={() => onPageChange(page as number)}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
              >
                {page}
              </Button>
            )}
          </React.Fragment>
        ))}
        
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
        >
          下一页
        </Button>
        
        <Button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
        >
          末页
        </Button>
      </div>
    </div>
  );
};

export default Pagination;