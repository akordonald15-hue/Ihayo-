// Fine botanical silhouettes for crop recognition, never scientific measurements.
export default function CropBotanical({ crop }: { crop: string }) {
  if (!['sorghum', 'millet', 'rice', 'cassava', 'groundnut', 'soybean'].includes(crop))
    return (
      <svg viewBox="0 0 120 90" aria-hidden="true" className="crop-botanical" fill="none">
        <path
          d="M22 69Q60 39 99 63M23 78Q63 49 100 72M33 55L33 32M33 42Q19 42 21 31Q31 28 33 42M33 38Q45 35 46 24Q34 24 33 38"
          stroke="currentColor"
          strokeWidth="1.2"
        />
      </svg>
    );
  const cereal = ['sorghum', 'millet', 'rice'].includes(crop);
  return (
    <svg viewBox="0 0 120 90" fill="none" aria-hidden="true" className="crop-botanical">
      <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        {cereal ? (
          <>
            <path d="M53 85C55 66 62 45 65 17M56 70C34 59 29 49 28 36C42 40 50 50 56 70M58 60C79 50 87 39 90 28C74 30 63 44 58 60" />
            {Array.from({ length: 8 }, (_, i) => (
              <g
                key={i}
                transform={`translate(${66 - i * 0.7} ${15 + i * 4.1}) rotate(${crop === 'rice' ? 20 : 0})`}
              >
                <ellipse
                  cx="-4"
                  cy="0"
                  rx={crop === 'millet' ? 2.4 : 3.4}
                  ry="4"
                  transform="rotate(-28)"
                />
                <ellipse
                  cx="4"
                  cy="0"
                  rx={crop === 'millet' ? 2.4 : 3.4}
                  ry="4"
                  transform="rotate(28)"
                />
              </g>
            ))}
          </>
        ) : crop === 'cassava' ? (
          <>
            <path d="M59 86L61 40M61 41L43 24M61 41L81 24" />
            <path d="M61 41C29 37 21 20 19 12C34 14 48 26 61 41C48 17 49 8 55 2C65 16 65 28 61 41C72 12 83 5 91 7C89 20 77 33 61 41C85 31 100 34 104 43C86 50 70 47 61 41C55 60 42 66 32 62C36 53 47 45 61 41Z" />
          </>
        ) : (
          <>
            <path d="M61 84C62 68 60 47 58 19M59 44C39 40 28 26 29 18C43 18 56 28 59 44M59 42C77 35 86 23 82 14C69 18 60 27 59 42M62 66C83 63 94 51 91 43C77 43 65 55 62 66M60 63C40 62 28 51 30 44C44 44 55 53 60 63" />
            {crop === 'groundnut' ? (
              <path d="M44 75C34 66 22 72 27 81C20 88 32 94 39 86C49 93 58 83 50 78C50 75 47 74 44 75Z" />
            ) : (
              <>
                <path d="M69 42C66 52 70 69 76 73C82 67 79 51 69 42Z" />
                <circle cx="73" cy="53" r="2" />
                <circle cx="75" cy="62" r="2" />
              </>
            )}
          </>
        )}
      </g>
    </svg>
  );
}
