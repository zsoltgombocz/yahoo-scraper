export const hasAtLeastTwoNegativeNumbers = (numbers: number[]): boolean => {
    let negativeCount = 0;

    for (let i = 0; i < numbers.length; i++) {
        if (numbers[i] < 0) {
            negativeCount++;

            if (negativeCount >= 2) {
                return true;
            }
        }
    }

    return false;
}

export const notEmpty = <TValue>(value: TValue | null | undefined): value is TValue => {
    return value !== null && value !== undefined;
}